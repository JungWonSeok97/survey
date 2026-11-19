import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  GET as getSession,
  POST as createSession,
} from "../app/api/survey/session/route";
import { POST as saveRound } from "../app/api/survey/route";
import { GET as listResponses } from "../app/api/admin/responses/route";
import { GET as exportResponses } from "../app/api/admin/export/route";
import { POST as login } from "../app/api/admin/login/route";
import { POST as logout } from "../app/api/admin/logout/route";
import { csvCell } from "../src/lib/admin-data";
import { hash, OWNER_COOKIE, ADMIN_COOKIE } from "../src/lib/server";
import { generateScenarios, SURVEY_VERSION } from "../src/lib/survey-schema";
import type { SurveySession } from "../src/lib/survey-schema";
import { participant } from "./fixtures";

const origin = "http://localhost:3000";
const token = "a".repeat(64),
  id = "5b8cdac1-a5b7-4f23-8ce9-ced6bc05f111";
const request = (
  path: string,
  method = "GET",
  data?: unknown,
  cookie = `${OWNER_COOKIE}=${token}`,
) =>
  new NextRequest(origin + path, {
    method,
    headers: { origin, "content-type": "application/json", cookie },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
const adminCookie = `${ADMIN_COOKIE}=verified-admin`;
test("actual API handlers enforce authentication, validate before writes, preserve session and export complete conditions", async () => {
  const originalFetch = globalThis.fetch;
  const env = { ...process.env };
  process.env.SUPABASE_URL = "https://survey.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-key";
  process.env.APP_ORIGIN = origin;
  let row: (SurveySession & { owner_hash: string }) | null = null;
  let writes = 0,
    failDatabase = false,
    exportMode = false;
  const calls: URL[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    calls.push(url);
    const headers = new Headers(init?.headers);
    const payload = init?.body ? JSON.parse(String(init.body)) : undefined;
    const reply = (value: unknown, status = 200, extra = {}) =>
      new Response(JSON.stringify(value), {
        status,
        headers: { "Content-Type": "application/json", ...extra },
      });
    if (url.pathname === "/auth/v1/user") {
      if (headers.get("authorization") === "Bearer verified-admin")
        return reply({ id: "admin", app_metadata: { survey_admin: true } });
      if (headers.get("authorization") === "Bearer ordinary-user")
        return reply({
          id: "user",
          app_metadata: {},
          user_metadata: { survey_admin: true },
        });
      return reply({ error: "invalid_token", message: "invalid token" }, 401);
    }
    if (url.pathname === "/auth/v1/token")
      return reply({
        access_token: "verified-admin",
        expires_in: 3600,
        refresh_token: "unused",
        token_type: "bearer",
        user: { id: "admin", app_metadata: { survey_admin: true } },
      });
    if (url.pathname === "/auth/v1/logout")
      return new Response(null, { status: 204 });
    if (failDatabase)
      return reply(
        { code: "XX000", message: "SECRET database details test@example.com" },
        500,
      );
    if (url.pathname === "/rest/v1/rpc/consume_survey_limit")
      return reply(true);
    if (url.pathname === "/rest/v1/rpc/save_survey_round") {
      writes++;
      return reply({ session: row, duplicate: false, savedRound: 1 });
    }
    if (url.pathname === "/rest/v1/survey_sessions") {
      if (init?.method === "POST") {
        writes++;
        row = {
          ...payload,
          id,
          total_rounds: 30,
          completed_rounds: 0,
          completed_at: null,
          abandoned_at: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        };
        return reply(row);
      }
      const qids = url.searchParams.get("question_ids");
      if (qids)
        assert.equal(
          qids,
          "eq.{1,6}",
          "PostgREST must receive an array literal",
        );
      if (
        url.searchParams.get("owner_hash") &&
        url.searchParams.get("owner_hash") !== `eq.${hash(token)}`
      )
        return reply([]);
      let rows = row ? [row] : [];
      if (exportMode && row)
        rows = Array.from({ length: 205 }, (_, n) => ({
          ...row!,
          id: `session-${n}`,
        }));
      const offset = Number(url.searchParams.get("offset") || 0),
        limit = Number(url.searchParams.get("limit") || 1000),
        count = rows.length;
      return reply(rows.slice(offset, offset + limit), 200, {
        "Content-Range": `0-${Math.max(0, count - 1)}/${count}`,
      });
    }
    if (url.pathname === "/rest/v1/survey_rounds")
      return reply([
        {
          round: 1,
          saved_at: "2026-01-01T00:00:00Z",
          questions: generateScenarios([1, 6], () => 0).map((q) => ({
            ...q,
            answer: "보통",
            answerCode: q.options[0].code,
          })),
        },
      ]);
    if (url.pathname === "/rest/v1/survey_responses")
      return reply([
        {
          id: 1,
          name: "=FORMULA()",
          employee_id: "OLD",
          round: 1,
          saved_at: "2025-01-01T00:00:00Z",
          questions: [
            {
              id: 6,
              answer: "나쁨",
              conditions: { 낙뢰: "낙뢰가 발생할 경우" },
            },
          ],
        },
      ]);
    throw new Error(`Unexpected request: ${url.pathname}`);
  };
  try {
    const fresh = await getSession(
      request("/api/survey/session", "GET", undefined, ""),
    );
    assert.equal(fresh.status, 200);
    assert.match(fresh.headers.get("set-cookie")!, /HttpOnly/i);
    assert.match(fresh.headers.get("set-cookie")!, /SameSite=strict/i);
    assert.equal(
      (
        await createSession(
          request("/api/survey/session", "POST", {
            participant: { name: "x" },
            questionIds: [1, 6],
          }),
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await saveRound(
          request("/api/survey", "POST", {
            sessionId: id,
            round: 99,
            answers: [],
          }),
        )
      ).status,
      400,
    );
    assert.equal(writes, 0);
    const created = await createSession(
      request("/api/survey/session", "POST", {
        participant,
        questionIds: [6, 1],
      }),
    );
    assert.equal(created.status, 200, await created.clone().text());
    const body = await created.json();
    assert.equal(body.session.owner_hash, undefined);
    assert.equal(body.session.survey_version, SURVEY_VERSION);
    const retry = await createSession(
      request("/api/survey/session", "POST", {
        participant,
        questionIds: [1, 6],
      }),
    );
    assert.equal((await retry.json()).session.id, id);
    assert.equal(writes, 1);
    const resumed = await getSession(request("/api/survey/session?ids=1,6"));
    assert.deepEqual(
      (await resumed.json()).session.pending_questions,
      body.session.pending_questions,
    );
    const foreign = await getSession(
      request(
        "/api/survey/session?id=" + id,
        "GET",
        undefined,
        `${OWNER_COOKIE}=${"b".repeat(64)}`,
      ),
    );
    assert.equal((await foreign.json()).session, null);
    assert.equal(
      (
        await saveRound(
          request("/api/survey", "POST", {
            sessionId: id,
            round: 1,
            answers: [],
          }),
        )
      ).status,
      400,
    );
    assert.equal(writes, 1);
    const valid = {
      sessionId: id,
      round: 1,
      answers: body.session.pending_questions.map(
        (q: { id: number; options: { code: string }[] }) => ({
          questionId: q.id,
          answerCode: q.options[0].code,
        }),
      ),
    };
    const crossSite = request("/api/survey", "POST", valid);
    crossSite.headers.set("origin", "https://attacker.test");
    assert.equal((await saveRound(crossSite)).status, 403);
    assert.equal(
      (
        await saveRound(
          request("/api/survey", "POST", { ...valid, conditions: {} }),
        )
      ).status,
      400,
    );
    assert.equal(
      (await saveRound(request("/api/survey", "POST", valid))).status,
      200,
    );
    for (const handler of [listResponses, exportResponses]) {
      assert.equal(
        (await handler(request("/api/admin/responses", "GET", undefined, "")))
          .status,
        401,
      );
      assert.equal(
        (
          await handler(
            request(
              "/api/admin/responses",
              "GET",
              undefined,
              `${ADMIN_COOKIE}=ordinary-user`,
            ),
          )
        ).status,
        403,
      );
    }
    const admin = await listResponses(
      request("/api/admin/responses", "GET", undefined, adminCookie),
    );
    assert.equal(admin.status, 200);
    const listing = await admin.json();
    assert.equal(listing.rows[0].owner_hash, undefined);
    assert.equal(listing.rows[0].participant.companyEmail, undefined);
    const loginResult = await login(
      request(
        "/api/admin/login",
        "POST",
        { email: "admin@example.com", password: "test-password" },
        "",
      ),
    );
    assert.equal(loginResult.status, 200);
    assert.match(loginResult.headers.get("set-cookie")!, /HttpOnly/i);
    assert.doesNotMatch(await loginResult.text(), /verified-admin|unused/);
    exportMode = true;
    const exported = await exportResponses(
      request(
        "/api/admin/export?source=v2&kind=answers",
        "GET",
        undefined,
        adminCookie,
      ),
    );
    assert.equal(exported.status, 200);
    const csv = await exported.text();
    assert.equal(csv.trim().split("\r\n").length, 411); // header + 205 sessions * 2 PSFs
    assert.match(csv, /F\.6\.S\.5\.1/);
    assert.match(csv, /낙뢰가 발생하지 않을 경우/);
    assert.doesNotMatch(csv, /test@example.com|TEST-CARD/);
    assert.ok(calls.some((url) => url.searchParams.get("offset") === "200"));
    assert.ok(
      calls.some(
        (url) =>
          url.pathname.endsWith("survey_rounds") &&
          url.searchParams.has("saved_at"),
      ),
    );
    const old = await exportResponses(
      request(
        "/api/admin/export?source=legacy&kind=participants",
        "GET",
        undefined,
        adminCookie,
      ),
    );
    const oldCSV = await old.text();
    assert.match(oldCSV, /legacy-record:1/);
    assert.match(oldCSV, /'=FORMULA/);
    assert.equal(csvCell("=1+2"), '"\'=1+2"');
    assert.equal(csvCell('a"b'), '"a""b"');
    const loggedOut = await logout(
      request("/api/admin/logout", "POST", undefined, adminCookie),
    );
    assert.equal(loggedOut.status, 200);
    assert.match(loggedOut.headers.get("set-cookie")!, /Max-Age=0/);
    failDatabase = true;
    const failed = await saveRound(request("/api/survey", "POST", valid));
    assert.equal(failed.status, 503);
    assert.doesNotMatch(await failed.text(), /SECRET|test@example.com/);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "APP_ORIGIN",
    ]) {
      if (env[name] === undefined) delete process.env[name];
      else process.env[name] = env[name];
    }
  }
});
