import { test, expect } from "@playwright/test";
import {
  FIELD_GROUPS,
  generateScenarios,
  SURVEY_VERSION,
} from "../src/lib/survey-schema";
import type { SurveySession } from "../src/lib/survey-schema";
import { participant } from "../tests/fixtures";

test("profile wizard, two questions, save-once, refresh resume and completion", async ({
  page,
}, testInfo) => {
  let session: SurveySession | null = null;
  let saves = 0;
  const payloads: unknown[] = [],
    pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/api/survey/session*", async (route) => {
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
    await route.fulfill({ json: { success: true, session } });
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
        session,
        savedRound: input.round,
        duplicate: false,
      },
    });
  });
  await page.goto("/survey/group3");
  await expect(
    page.getByRole("heading", { name: "철도 현장의 판단을 들려주세요." }),
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
        name: step === 2 ? "설문 시작하기 →" : "다음 단계 →",
        exact: true,
      })
      .click();
  }
  expect(payloads).toHaveLength(1);
  expect(
    (payloads[0] as { participant: typeof participant }).participant.workTime,
  ).toBe("09:00/18:00");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "다음 문항 →", exact: true }).click();
  await expect(
    page.getByText("낙뢰가 발생하지 않을 경우", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("안개가 발생하지 않을 경우", { exact: true }),
  ).toBeVisible();
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
  // Reload before saving: selections restore from this tab's draft and the server scenario is unchanged.
  await page.reload();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await page.getByRole("button", { name: "다음 문항 →", exact: true }).click();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await page
    .getByRole("button", { name: "이번 회차 저장 →", exact: true })
    .dblclick();
  await expect(page.getByText("ROUND 02 / 30")).toBeVisible();
  expect(saves).toBe(1);
  await page.reload();
  await expect(page.getByText("ROUND 02 / 30")).toBeVisible();
  // Restore the last pending round and verify final completion has no second submission/email action.
  const lastSession = session as SurveySession | null;
  if (!lastSession) throw new Error("missing session");
  session = { ...lastSession, completed_rounds: 29 };
  await page.reload();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "다음 문항 →", exact: true }).click();
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
  expect(pageErrors).toEqual([]);
});

test("group assignment and unauthenticated admin access", async ({
  page,
  request,
}) => {
  await page.route("**/api/survey/session*", (route) =>
    route.fulfill({ json: { success: true, session: null } }),
  );
  await page.goto("/survey/group3");
  await expect(page.locator(".assigned-psf").filter({hasText:"PSF 5"})).toBeVisible();
  await expect(page.locator(".assigned-psf").filter({hasText:"PSF 6"})).toBeVisible();
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
