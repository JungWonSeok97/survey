import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("legacy people views preserve every response, separate conflicting identities and use latest numeric years", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create table survey_responses(id uuid primary key default gen_random_uuid(),employee_id text,name text,date_of_birth text,
        affiliation text,job text,years text,round integer,questions jsonb,saved_at timestamptz);
      alter table survey_responses enable row level security;
      grant select on survey_responses to service_role;
      insert into survey_responses(employee_id,name,date_of_birth,affiliation,job,years,round,questions,saved_at) values
      ('E1','가상참여자','1990-01-01','A','A','9',1,'[{"id":1},{"id":2}]','2025-01-01'),
      (' E1 ',' 가상참여자 ','1990-01-01','B','B','10',1,'[{"id":3},{"id":4}]','2026-01-01'),
      ('E2','가상참여자','1990-01-01','A','A','2',1,'[]','2025-01-01'),
      ('E1','다른이름','1990-01-01','A','A','30',1,'[]','2025-01-01'),
      ('E1','가상참여자','1991-01-01','A','A','20',1,'[]','2025-01-01'),
      ('','미상','','A','A','unknown',1,'[]','2025-01-01'),
      ('','미상','','A','A','unknown',1,'[]','2025-01-01');`);
    await db.exec(readFileSync("supabase/migrations/202611200001_legacy_people.sql", "utf8"));
    assert.equal((await db.query<{n:number}>("select count(*)::int n from survey_legacy_people")).rows[0].n,6);
    const person=(await db.query<{person_id:string;record_count:number;answer_count:number;affiliation:string}>("select * from survey_legacy_people where record_count=2")).rows[0];
    assert.equal(person.answer_count,4); assert.equal(person.affiliation,"B");
    assert.match(person.person_id,/^[a-f0-9]{64}$/);
    assert.equal((await db.query<{n:number}>("select count(*)::int n from survey_legacy_answers where person_years_numeric >= 10 and person_years_numeric < 20")).rows[0].n,2);
    assert.equal((await db.query<{n:number}>("select count(*)::int n from survey_responses")).rows[0].n,7);
    const access=(await db.query<{a:boolean;b:boolean;c:boolean}>(`select
      has_table_privilege('anon','survey_legacy_people','SELECT') a,
      has_table_privilege('authenticated','survey_legacy_records','SELECT') b,
      has_table_privilege('service_role','survey_legacy_people','SELECT') c`)).rows[0];
    assert.deepEqual(access,{a:false,b:false,c:true});
    await db.exec(readFileSync("supabase/migrations/202611190002_survey_admins.sql", "utf8"));
    await db.exec(readFileSync("supabase/migrations/202611200002_admin_performance.sql", "utf8"));
    const cached = async () => (await db.query<{n:number}>("select sum(record_count)::int n from survey_legacy_people_cache")).rows[0].n;
    assert.equal(await cached(),7);
    assert.equal((await db.query<{n:number}>("select count(*)::int n from (select * from survey_legacy_people except select * from survey_legacy_people_cache) d")).rows[0].n,0);
    await db.exec("update survey_responses set years='11' where employee_id=' E1 '");
    assert.equal((await db.query<{years:string}>("select years from survey_legacy_people_cache where record_count=2")).rows[0].years,"11");
    await db.exec("insert into survey_responses(employee_id,name,date_of_birth,years,round,questions,saved_at) values('E3','추가','1990-01-01','1',1,'[]',now())");
    assert.equal(await cached(),8);
    await db.exec("delete from survey_responses where employee_id='E3'");
    assert.equal(await cached(),7);
    const account = (await db.query<{id:string}>("insert into survey_admins(username,password_hash) values('tester',$1) returning id", [`scrypt-v1$${"a".repeat(32)}$${"b".repeat(128)}`])).rows[0].id;
    const token = "d".repeat(64);
    await db.query("insert into survey_admin_sessions(token_hash,admin_id) values($1,$2)",[token,account]);
    const verify = async () => (await db.query<{a:{id:string}|null}>("select verify_survey_admin_session($1) a",[token])).rows[0].a;
    assert.equal((await verify())?.id,account);
    await db.query("update survey_admin_sessions set expires_at=now()-interval '1 second' where token_hash=$1",[token]);
    assert.equal(await verify(),null);
    await db.query("update survey_admin_sessions set expires_at=now()+interval '1 hour' where token_hash=$1",[token]);
    await db.query("update survey_admins set is_active=false where id=$1",[account]);
    assert.equal(await verify(),null);
    assert.equal((await db.query<{allowed:boolean}>("select has_table_privilege('anon','survey_legacy_people_cache','SELECT') allowed")).rows[0].allowed,false);
    assert.equal((await db.query<{allowed:boolean}>("select has_function_privilege('anon','verify_survey_admin_session(text)','EXECUTE') allowed")).rows[0].allowed,false);
    await db.exec("set role service_role");
    assert.equal((await db.query<{n:number}>("select sum(record_count)::int n from survey_legacy_people")).rows[0].n,7);
  } finally { await db.close(); }
});
