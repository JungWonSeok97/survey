import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import {
  generateScenarios,
  SURVEY_VERSION,
  validateAnswers,
} from "../src/lib/survey-schema";
import { participant } from "./fixtures";

test("PostgreSQL migration: ownership, immutable conditions, duplicate rounds, completion, privileges and legacy preservation", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create table public.survey_responses(id integer primary key, questions jsonb);
      insert into public.survey_responses values(1, '[{"answer":"legacy unchanged"}]');
      grant select,insert on public.survey_responses to anon,authenticated;`);
    await db.exec(
      readFileSync("supabase/migrations/202611190001_survey_v2.sql", "utf8"),
    );
    const hash = "a".repeat(64),
      initial = generateScenarios([1, 6], () => 0),
      next = generateScenarios([1, 6], () => 0.999);
    const inserted = await db.query<{ id: string }>(
      `insert into survey_sessions(owner_hash,survey_version,question_ids,participant,pending_questions) values($1,$2,'{1,6}',$3,$4) returning id`,
      [
        hash,
        SURVEY_VERSION,
        JSON.stringify(participant),
        JSON.stringify(initial),
      ],
    );
    const id = inserted.rows[0].id;
    const answers = validateAnswers(
      initial.map((q) => ({ questionId: q.id, answerCode: q.options[0].code })),
      [1, 6],
    );
    const save = async (round: number, payload = answers, owner = hash) => {
      const result = await db.query<{
        result: {
          duplicate: boolean;
          session: {
            completed_rounds: number;
            pending_questions: unknown[];
            completed_at: string | null;
            owner_hash?: string;
          };
        };
      }>(`select save_survey_round($1,$2,$3,$4,$5) as result`, [
        id,
        owner,
        round,
        JSON.stringify(payload),
        JSON.stringify(next),
      ]);
      return result.rows[0].result;
    };
    await assert.rejects(save(1, answers, "b".repeat(64)), /SESSION_NOT_FOUND/);
    await assert.rejects(save(2), /ROUND_CONFLICT/);
    await assert.rejects(
      save(1, [{ ...answers[0], answer: "not an option" }, answers[1]]),
      /INVALID_ANSWERS/,
    );
    const first = await Promise.all([save(1), save(1)]);
    assert.equal(first.filter((x) => x.duplicate).length, 1);
    assert.equal(first[0].session.owner_hash, undefined);
    const stored = await db.query<{ questions: typeof initial }>(
      `select questions from survey_rounds where session_id=$1`,
      [id],
    );
    assert.deepEqual(
      stored.rows[0].questions[1].conditions,
      initial[1].conditions,
    );
    assert.notDeepEqual(
      stored.rows[0].questions[1].conditions,
      next[1].conditions,
    );
    const alternate = validateAnswers(
      initial.map((q) => ({ questionId: q.id, answerCode: q.options[1].code })),
      [1, 6],
    );
    await assert.rejects(save(1, alternate), /ANSWER_CONFLICT/);
    for (let round = 2; round <= 30; round++) await save(round);
    const final = await save(30);
    assert.equal(final.duplicate, true);
    assert.equal(final.session.completed_rounds, 30);
    assert.equal(final.session.pending_questions.length, 0);
    assert.ok(final.session.completed_at);
    await assert.rejects(save(31), /ROUND_CONFLICT/);
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from survey_rounds",
        )
      ).rows[0].count,
      30,
    );
    assert.equal(
      (
        await db.query<{ questions: unknown }>(
          "select questions from survey_responses",
        )
      ).rows[0].questions && true,
      true,
    );
    const legacy = (
      await db.query<{ questions: { answer: string }[] }>(
        "select questions from survey_responses",
      )
    ).rows[0];
    assert.equal(legacy.questions[0].answer, "legacy unchanged");
    const permissions = await db.query<{
      a: boolean;
      b: boolean;
      c: boolean;
      d: boolean;
    }>(`select has_table_privilege('anon','survey_sessions','SELECT') a,
      has_table_privilege('authenticated','survey_responses','SELECT') b,
      has_function_privilege('anon','save_survey_round(uuid,text,integer,jsonb,jsonb)','EXECUTE') c,
      has_table_privilege('service_role','survey_rounds','SELECT') d`);
    assert.deepEqual(permissions.rows[0], {
      a: false,
      b: false,
      c: false,
      d: true,
    });
    for (let i = 0; i < 3; i++) {
      const result = await db.query<{ allowed: boolean }>(
        "select consume_survey_limit('test',2,60) as allowed",
      );
      assert.equal(result.rows[0].allowed, i < 2);
    }
  } finally {
    await db.close();
  }
});
