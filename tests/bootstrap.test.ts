import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("bootstrap an empty DB and retain the existing legacy schema on upgrade", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
    for (const name of readdirSync("supabase/migrations").sort())
      await db.exec(readFileSync("supabase/migrations/" + name, "utf8"));
    await db.exec("insert into survey_responses(name,affiliation,job,years,round,questions) values ('fixture','fixture','fixture','10',1,'[]')");
    await db.exec(readFileSync("supabase/migrations/202611190000_legacy_baseline.sql", "utf8"));
    assert.equal((await db.query("select * from survey_legacy_people_cache")).rows.length, 1);
  } finally { await db.close(); }
});
