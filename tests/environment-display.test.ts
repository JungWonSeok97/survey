import assert from "node:assert/strict";
import test from "node:test";
import { groupEnvironmentConditions } from "../src/lib/environment-display";
import { ALL_OPTION_LISTS, SURVEY_DATA } from "../src/lib/surveyData";
import { v2Options } from "../src/lib/survey-v2-options";

test("each known environment level has a compact display value in both survey versions", () => {
  const environment = SURVEY_DATA.find((question) => question.id === 6)!;
  const labels: Record<string, string | undefined> = environment.condition_labels;
  const options: Record<string, string[]> = ALL_OPTION_LISTS;
  for (const key of environment.condition_keys) {
    const label = labels[key]!;
    for (const original of new Set([...options[key], ...(v2Options[key] ?? [])])) {
      const [section] = groupEnvironmentConditions({ [label]: original });
      assert.notEqual(section.title, "그 밖의 작업조건");
      assert.notEqual(section.items[0][1], original, original);
    }
  }
});

test("historical boundaries, both rain/snow units and unknown saved wording are preserved", () => {
  const conditions = {
    "소음": "소음이 85~115dB인 경우",
    "실외 습도": "실외 습도가 90% 이하인 경우",
    "비": "비가 10mm/h(눈의 경우 1cm/h) 이상",
    "기타 조건": "연구자가 추가한 조건",
  };
  const original = { ...conditions };
  assert.deepEqual(groupEnvironmentConditions(conditions), [
    { title: "실외 기상", items: [["비·눈", "비 10 mm/h 이상 (눈 1 cm/h 이상)"], ["실외 습도", "90% 이하"]] },
    { title: "소음·가시성", items: [["소음", "85~115 dB"]] },
    { title: "그 밖의 작업조건", items: [["기타 조건", "연구자가 추가한 조건"]] },
  ]);
  assert.deepEqual(conditions, original);
  const legacyRain = "비가 10mm/s(눈의 경우 1cm/s) 이상";
  assert.deepEqual(groupEnvironmentConditions({ "비": legacyRain })[0].items, [["비", legacyRain]]);
});
