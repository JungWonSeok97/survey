import { test, expect } from "@playwright/test";
import {
  FIELD_GROUPS,
  generateScenarios,
  SURVEY_VERSION,
} from "../src/lib/survey-schema";
import type { SurveySession } from "../src/lib/survey-schema";
import { participant } from "../tests/fixtures";

test("profile wizard, draft recovery, round saving, pause, resume and completion", async ({
  page,
}, testInfo) => {
  let session: SurveySession | null = null;
  let saves = 0;
  let disconnects = 0;
  const payloads: unknown[] = [],
    pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/api/survey/session*", async (route) => {
    if (route.request().method() === "DELETE") {
      expect(route.request().postDataJSON().disconnect).toBe(true);
      disconnects++;
      session = null;
    }
    if (route.request().method() === "POST") {
      const input = route.request().postDataJSON();
      payloads.push(input);
      session = {
        id: "5b8cdac1-a5b7-4f23-8ce9-ced6bc05f111",
        participant: input.participant,
        question_ids: input.questionIds,
        survey_version: SURVEY_VERSION,
        total_rounds: 30,
        completed_rounds: 0,
        pending_questions: generateScenarios(input.questionIds, () => 0),
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        completed_at: null,
        abandoned_at: null,
      };
    }
    if (session) {
      for (const q of session.pending_questions)
        q.conditions = Object.fromEntries(Object.entries(q.conditions).sort(([a], [b]) => a.localeCompare(b)));
    }
    const publicSession = session ? { ...session, participant: undefined } : null;
    await route.fulfill({ json: { success: true, session: publicSession } });
  });
  await page.route("**/api/survey", async (route) => {
    saves++;
    const input = route.request().postDataJSON();
    expect(Object.keys(input).sort()).toEqual([
      "answers",
      "round",
      "sessionId",
    ]);
    expect(input.answers).toHaveLength(2);
    if (!session) throw new Error("missing session");
    session = {
      ...session,
      completed_rounds: input.round,
      pending_questions:
        input.round === 30 ? [] : generateScenarios([5, 6], () => 0.999),
      completed_at: input.round === 30 ? "2026-01-01" : null,
    };
    await route.fulfill({
      json: {
        success: true,
        session: { ...session, participant: undefined },
        savedRound: input.round,
        duplicate: false,
      },
    });
  });
  await page.goto("/survey/group3");
  await expect(
    page.getByRole("heading", { name: "철도종사자 작업조건 설문" }),
  ).toBeVisible();
  await expect(page.locator(".assigned-psf")).toHaveCount(2);
  for (let step = 0; step < 3; step++) {
    for (const field of FIELD_GROUPS[step].fields) {
      if (field.type === "workTime") continue;
      const input = page.locator(`#${field.key}`);
      if (field.type === "job" || field.type === "gender")
        await input.selectOption(participant[field.key]);
      else await input.fill(participant[field.key]);
    }
    if (step === 2) {
      await page
        .getByLabel("출근 오전·오후", { exact: true })
        .selectOption("AM");
      await page.getByLabel("출근 시", { exact: true }).selectOption("9");
      await page.getByLabel("출근 분", { exact: true }).selectOption("00");
      await page
        .getByLabel("퇴근 오전·오후", { exact: true })
        .selectOption("PM");
      await page.getByLabel("퇴근 시", { exact: true }).selectOption("6");
      await page.getByLabel("퇴근 분", { exact: true }).selectOption("00");
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      await page.screenshot({
        path: testInfo.outputPath("profile.png"),
        fullPage: true,
      });
    }
    await page
      .getByRole("button", {
        name: step === 2 ? "설문 시작하기" : "다음 단계",
        exact: true,
      })
      .click();
  }
  expect(payloads).toHaveLength(1);
  expect(
    (payloads[0] as { participant: typeof participant }).participant.workTime,
  ).toBe("09:00/18:00");
  await page.getByRole("radio").first().check();
  // Returning with one answer in this tab should open the first unanswered question.
  await page.reload();
  const environment = page.getByRole("article", { name: "환경요인" });
  await expect(environment).toBeVisible();
  await expect(page.getByRole("heading", { name: "1/30회차 · 2/2문항" })).toBeVisible();
  const indoor = environment.locator(".condition-group").filter({
    has: page.getByRole("heading", { name: "실내 쾌적성", exact: true }),
  });
  await expect(indoor.locator("dt")).toHaveText(["실내 온도", "실내 습도", "통풍"]);
  for (const label of ["낙뢰", "안개"]) {
    const condition = environment.locator("dl > div").filter({
      has: page.getByRole("term").filter({ hasText: label }),
    });
    await expect(condition.locator("dd")).toHaveText("발생하지 않음");
  }
  await page.getByRole("radio").first().check();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: testInfo.outputPath("environment.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  // With both answers present, stay at the last question so the round can be saved.
  await page.reload();
  await expect(environment).toBeVisible();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await page.getByRole("button", { name: "이전 문항", exact: true }).click();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await page.getByRole("button", { name: "다음 문항", exact: true }).click();
  await page
    .getByRole("button", { name: "이번 회차 저장", exact: true })
    .dblclick();
  await expect(page.getByRole("heading", { name: "1회차까지 저장했습니다." })).toBeVisible();
  await expect(page.getByRole("button", { name: "2회차 계속하기" })).toBeVisible();
  await page.getByRole("button", { name: "잠시 마치기", exact: true }).click();
  await expect(page.getByRole("heading", { name: "설문을 잠시 마쳤습니다." })).toBeVisible();
  await page.getByRole("button", { name: "2회차 이어서 작성" }).click();
  await expect(page.getByRole("article", { name: "의사소통" })).toBeVisible();
  await expect(page.getByRole("radio").first()).not.toBeChecked();
  expect(saves).toBe(1);
  await page.reload();
  await expect(page.getByRole("article", { name: "의사소통" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "2/30회차 · 1/2문항" })).toBeVisible();
  await expect(page.locator(".save-state strong")).toHaveText("1회차까지 저장됨");
  await expect(page.locator(".save-state strong")).toBeVisible();
  expect(disconnects).toBe(0);
  // Restore the last pending round and verify final completion has no second submission/email action.
  const lastSession = session as SurveySession | null;
  if (!lastSession) throw new Error("missing session");
  session = { ...lastSession, completed_rounds: 29 };
  await page.reload();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "다음 문항", exact: true }).click();
  await page.getByRole("radio").first().check();
  await page
    .getByRole("button", { name: "마지막 회차 저장", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "설문이 모두 저장되었습니다." }),
  ).toBeVisible();
  await expect(
    page.getByText("30회차 · 총 60개 응답이 서버에 저장되었습니다."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /메일|제출/ })).toHaveCount(0);
  await page.getByRole("button", { name: "다른 참여자로 전환", exact: true }).click();
  await page.getByRole("button", { name: "연결 해제 · 다른 참여자로 시작" }).click();
  await expect(page.locator("#name")).toHaveValue("");
  await expect(page.locator("#employeeId")).toHaveValue("");
  expect(disconnects).toBe(1);
  expect(saves).toBe(2);
  expect(pageErrors).toEqual([]);
});

test("group assignment and unauthenticated admin access", async ({
  page,
  request,
}) => {
  await page.route("**/api/survey/session*", (route) =>
    route.fulfill({ json: { success: true, session: null } }),
  );
  for (let group = 1; group <= 4; group++) {
    await page.goto(`/survey/group${group}`);
    await expect(page.getByRole("heading", { name: "철도종사자 작업조건 설문" })).toBeVisible();
    const assigned = page.locator(".assigned-psf");
    await expect(assigned).toHaveCount(2);
    await expect(assigned.nth(0)).toContainText(`PSF ${group * 2 - 1}`);
    await expect(assigned.nth(1)).toContainText(`PSF ${group * 2}`);
    await expect(page.getByLabel("성명", { exact: true })).toBeVisible();
  }
  const response = await request.get("/api/admin/responses");
  expect(response.status()).toBe(401);
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByLabel("아이디", { exact: true })).toBeVisible();
  await expect(page.getByLabel("비밀번호", { exact: true })).toBeVisible();
});

test("only assigned group pages remain; retired entry pages return 404", async ({request}) => {
  for (const path of ["/survey", "/main", "/second"]) expect((await request.get(path)).status()).toBe(404);
  for (let n=1;n<=4;n++) expect((await request.get(`/survey/group${n}`)).status()).toBe(200);
});
