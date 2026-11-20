import test from "node:test";
import assert from "node:assert/strict";
import { ALL_OPTION_LISTS, SURVEY_DATA } from "../src/lib/surveyData";
import {
  FIELD_GROUPS,
  generateScenarios,
  validateAnswers,
  validateParticipant,
  validateQuestionIds,
  validateRound,
} from "../src/lib/survey-schema";
import { participant } from "./fixtures";

test("profile validation accepts complete and stepwise input, rejects malformed values", () => {
  assert.deepEqual(validateParticipant(participant), participant);
  for (const group of FIELD_GROUPS)
    assert.equal(
      Object.keys(
        validateParticipant(
          participant,
          group.fields.map((f) => f.key),
        ),
      ).length,
      group.fields.length,
    );
  for (const [key, value] of Object.entries({
    name: "",
    job: "허용되지 않는 직무",
    years: "99",
    dateOfBirth: "2025-02-30",
    healthCheckDate: "2099-01-01",
    companyEmail: "bad",
    officePhone: "abc",
    workTime: "25:00/18:00",
    bodyTemperature: "NaN",
    pulse: "-1",
  })) {
    assert.throws(
      () => validateParticipant({ ...participant, [key]: value }),
      key,
    );
  }
  assert.throws(() => validateParticipant({ ...participant, admin: true }));
  assert.throws(() => validateParticipant({ ...participant, years: 10 }));
  assert.throws(() => validateParticipant(null));
  assert.throws(() => validateParticipant({ ...participant, years: "10.0" }));
  assert.throws(() => validateParticipant({ ...participant, officePhone: "-------" }));
});
test("only two distinct assigned questions and valid answer codes are accepted", () => {
  assert.deepEqual(validateQuestionIds([6, 5]), [5, 6]);
  for (const ids of [[1,2],[3,4],[5,6],[7,8]]) assert.deepEqual(validateQuestionIds(ids),ids);
  for (const ids of [[1,6],[2,3],[4,8]]) assert.throws(() => validateQuestionIds(ids));
  for (const value of [[1], [1, 1], [1, 9], ["1", 6], null])
    assert.throws(() => validateQuestionIds(value));
  const valid = [
    { questionId: 5, answerCode: "F.5.1" },
    { questionId: 6, answerCode: "F.6.1" },
  ];
  assert.equal(validateAnswers(valid, [5, 6]).length, 2);
  for (const value of [
    [],
    [valid[0], valid[0]],
    [valid[0], { questionId: 6, answerCode: "좋음" }],
    [{ ...valid[0], answer: "나쁨" }, valid[1]],
  ])
    assert.throws(() => validateAnswers(value, [5, 6]));
  assert.throws(() => validateAnswers(valid, [2, 4]));
  for (const value of [0, 31, 99, "1", null, 1.5, true])
    assert.throws(() => validateRound(value));
  assert.equal(validateRound(30), 30);
});
test("environment includes both lightning/fog states and exactly 82,944 combinations", () => {
  assert.deepEqual(ALL_OPTION_LISTS.env_lightning, [
    "낙뢰가 발생하지 않을 경우",
    "낙뢰가 발생할 경우",
  ]);
  assert.deepEqual(ALL_OPTION_LISTS.env_fog, [
    "안개가 발생하지 않을 경우",
    "안개가 발생할 경우",
  ]);
  const env = SURVEY_DATA.find((q) => q.id === 6)!;
  assert.equal(env.condition_keys.length, 14);
  assert.equal(
    env.condition_keys.reduce(
      (n, key) =>
        n * ALL_OPTION_LISTS[key as keyof typeof ALL_OPTION_LISTS].length,
      1,
    ),
    82944,
  );
  const low = generateScenarios([5, 6], () => 0),
    high = generateScenarios([5, 6], () => 0.999999);
  assert.equal(low[1].conditionCodes["F.6.S.5"], "F.6.S.5.1");
  assert.equal(high[1].conditionCodes["F.6.S.5"], "F.6.S.5.2");
  assert.equal(low[1].conditionCodes["F.6.S.6"], "F.6.S.6.1");
  assert.equal(high[1].conditionCodes["F.6.S.6"], "F.6.S.6.2");
  assert.equal(low[1].conditionCodes["F.6.S.9"], "F.6.S.9.2"); // favorable friction is displayed first
  assert.equal(high[1].conditionCodes["F.6.S.9"], "F.6.S.9.1");
  assert.equal(generateScenarios([1,2], () => 0)[0].conditionCodes["F.1.S.3"], "F.1.S.3.1"); // short sleep, not good-risk rank
  assert.equal(generateScenarios([1,2], () => 0.999999)[0].conditionCodes["F.1.S.3"], "F.1.S.3.3");
  for (const ids of [
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8],
  ])
    for (const scenario of generateScenarios(ids)) {
      assert.equal(
        Object.keys(scenario.conditions).length,
        Object.keys(scenario.conditionCodes).length,
      );
      assert.ok(
        Object.values(scenario.conditions).every(
          (value) => typeof value === "string" && value.length,
        ),
      );
    }
});
