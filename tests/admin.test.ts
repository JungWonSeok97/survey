import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import { hashPassword, verifyPassword } from "../src/lib/admin-password";
import { hash, ADMIN_COOKIE, verifyAdminToken } from "../src/lib/server";
import { POST as login } from "../app/api/admin/login/route";
import { POST as logout } from "../app/api/admin/logout/route";
import { POST as changePassword } from "../app/api/admin/password/route";

test("passwords are salted; PostgreSQL restricts access and revokes all sessions on password change", async () => {
  const oldHash = await hashPassword("test-password-old"), newHash = await hashPassword("test-password-new");
  assert.notEqual(oldHash, await hashPassword("test-password-old"));
  assert.ok(await verifyPassword("test-password-old", oldHash));
  assert.equal(await verifyPassword("wrong", oldHash), false);
  assert.equal(await verifyPassword("anything", "malformed"), false);
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
    await db.exec(readFileSync("supabase/migrations/202611190002_survey_admins.sql", "utf8"));
    const id = (await db.query<{id:string}>("insert into survey_admins(username,password_hash) values('admin',$1) returning id", [oldHash])).rows[0].id;
    const issue = async (token: string, password = oldHash) => (await db.query<{ok:boolean}>("select issue_survey_admin_session($1,$2,$3) ok",[id,password,token])).rows[0].ok;
    const rotate = async (token: string) => (await db.query<{ok:boolean}>("select change_survey_admin_password($1,$2,$3,$4) ok",[id,token,oldHash,newHash])).rows[0].ok;
    const token = "a".repeat(64), other = "b".repeat(64);
    assert.ok(await issue(token)); assert.ok(await issue(other));
    assert.equal(await rotate("c".repeat(64)), false);
    await db.query("update survey_admin_sessions set expires_at=now()-interval '1 second' where token_hash=$1", [other]);
    assert.equal(await rotate(other), false);
    assert.ok(await rotate(token));
    assert.equal((await db.query<{n:number}>("select count(*)::int n from survey_admin_sessions")).rows[0].n,0);
    assert.equal(await issue(token),false); // Old password cannot issue a new session after rotation.
    assert.ok(await issue(token,newHash));
    await db.query("update survey_admins set is_active=false where id=$1",[id]);
    assert.equal(await issue(other,newHash),false);
    const privileges = (await db.query<{a:boolean;b:boolean;c:boolean;d:boolean}>(`select
      has_table_privilege('anon','survey_admins','SELECT') a,
      has_table_privilege('authenticated','survey_admin_sessions','INSERT') b,
      has_function_privilege('anon','issue_survey_admin_session(uuid,text,text)','EXECUTE') c,
      has_table_privilege('service_role','survey_admins','SELECT') d`)).rows[0];
    assert.deepEqual(privileges,{a:false,b:false,c:false,d:true});
  } finally { await db.close(); }
});

test("admin API rejects wrong/disabled credentials, expired sessions and CSRF; logout and password changes revoke access", async () => {
  const originalFetch = globalThis.fetch, env = {...process.env};
  const origin = "http://localhost:3000";
  process.env.SUPABASE_URL = "https://survey.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  process.env.APP_ORIGIN = origin;
  let passwordHash = await hashPassword("old-test-password"), active = true, expired = false, available = true;
  const sessions = new Set<string>();
  const req = (path:string, payload:unknown, token="") => new NextRequest(origin+path,{method:"POST",headers:{origin,"content-type":"application/json",cookie:`${ADMIN_COOKIE}=${token}`},body:JSON.stringify(payload)});
  globalThis.fetch = async (input,init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const payload = init?.body ? JSON.parse(String(init.body)) : {};
    const reply = (body:unknown,status=200) => new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
    if (!available) return reply({message:"internal secret"},500);
    if (url.pathname.endsWith("consume_survey_limit")) return reply(true);
    if (url.pathname.endsWith("verify_survey_admin_session")) return reply(sessions.has(payload.p_token_hash) && !expired && active ? {id:"admin",username:"admin",is_active:true} : null);
    if (url.pathname.endsWith("survey_admins")) {
      const row = {id:"admin",username:"admin",password_hash:passwordHash,is_active:active};
      if (new Headers(init?.headers).get("accept")?.includes("vnd.pgrst.object")) return reply(row);
      return reply(url.searchParams.get("username") === "eq.missing" ? [] : [row]);
    }
    if (url.pathname.endsWith("issue_survey_admin_session")) { sessions.add(payload.p_token_hash); return reply(true); }
    if (url.pathname.endsWith("change_survey_admin_password")) { passwordHash = payload.p_new_hash; sessions.clear(); return reply(true); }
    if (url.pathname.endsWith("survey_admin_sessions")) {
      const tokenHash = url.searchParams.get("token_hash")!.slice(3);
      if (init?.method === "DELETE") { sessions.delete(tokenHash); return new Response(null,{status:204}); }
      assert.ok(url.searchParams.get("expires_at")?.startsWith("gt."));
      return reply(sessions.has(tokenHash) && !expired ? [{admin_id:"admin"}] : []);
    }
    throw new Error("Unexpected test endpoint");
  };
  try {
    for (const username of ["admin","missing"]) assert.equal((await login(req("/api/admin/login",{username,password:"wrong"}))).status,401);
    active=false;
    assert.equal((await login(req("/api/admin/login",{username:"admin",password:"old-test-password"}))).status,401);
    active=true;
    const signIn = async (password="old-test-password") => {
      const response = await login(req("/api/admin/login",{username:"admin",password}));
      assert.equal(response.status,200,await response.clone().text());
      const cookie = response.headers.get("set-cookie")!;
      assert.match(cookie,/HttpOnly/); assert.match(cookie,/SameSite=strict/i);
      const token = cookie.match(/rail_survey_admin=([a-f0-9]{64})/)![1];
      assert.ok(sessions.has(hash(token))); assert.equal(sessions.has(token),false);
      assert.doesNotMatch(await response.text(),new RegExp(token));
      return token;
    };
    const token = await signIn();
    assert.equal((await verifyAdminToken(token)).username,"admin");
    expired=true; await assert.rejects(verifyAdminToken(token),{status:401}); expired=false;
    active=false; await assert.rejects(verifyAdminToken(token),{status:401}); active=true;
    const attack = req("/api/admin/password",{currentPassword:"old-test-password",newPassword:"new-test-password"},token);
    attack.headers.set("origin","https://attacker.test");
    assert.equal((await changePassword(attack)).status,403);
    assert.equal((await changePassword(req("/api/admin/password",{currentPassword:"wrong",newPassword:"new-test-password"},token))).status,401);
    assert.equal((await changePassword(req("/api/admin/password",{currentPassword:"old-test-password",newPassword:"short"},token))).status,400);
    const second = await signIn();
    assert.equal((await changePassword(req("/api/admin/password",{currentPassword:"old-test-password",newPassword:"new-test-password"},token))).status,200);
    await assert.rejects(verifyAdminToken(token),{status:401}); await assert.rejects(verifyAdminToken(second),{status:401});
    assert.equal((await login(req("/api/admin/login",{username:"admin",password:"old-test-password"}))).status,401);
    const final = await signIn("new-test-password");
    assert.equal((await logout(req("/api/admin/logout",{},final))).status,200);
    await assert.rejects(verifyAdminToken(final),{status:401});
    available=false;
    const error = await login(req("/api/admin/login",{username:"admin",password:"new-test-password"}));
    assert.equal(error.status,503); assert.doesNotMatch(await error.text(),/internal secret/);
  } finally {
    globalThis.fetch=originalFetch;
    for (const key of ["SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","APP_ORIGIN"]) {
      if (env[key] === undefined) delete process.env[key]; else process.env[key]=env[key];
    }
  }
});
