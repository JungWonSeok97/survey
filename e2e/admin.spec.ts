import { test, expect } from "@playwright/test";

test("legacy people are the default; complete history opens and new surveys remain selectable", async ({page,context,baseURL}, testInfo) => {
  await context.addCookies([{name:"rail_survey_admin",value:"c".repeat(64),url:baseURL!,httpOnly:true,sameSite:"Strict"}]);
  const id = "e".repeat(64);
  const participant = {name:"가상 참여자",employeeId:"TEST-1",affiliation:"테스트 소속",job:"기관사",years:"12"};
  const requests:string[]=[];
  await page.route("**/api/admin/responses*", async route => {
    const url=new URL(route.request().url());
    requests.push(url.searchParams.get("source")!);
    if (url.searchParams.has("id")) {
      await route.fulfill({json:{success:true,source:"legacy",participant,rounds:[
        {id:"a",round:1,saved_at:"2025-01-01",questions:[{id:1,answer:"보통",conditions:{조건:"가상 조건 A"}}]},
        {id:"b",round:1,saved_at:"2026-01-01",questions:[{id:2,answer:"나쁨",conditions:{조건:"가상 조건 B"}}]},
        {id:"c",round:2,saved_at:"2026-01-02",questions:[{id:2,answer:"보통",conditions:{조건:"가상 조건 C"}}]},
      ]}});
    } else await route.fulfill({json:{success:true,total:url.searchParams.get("source")==="legacy"?1:0,rows:url.searchParams.get("source")==="legacy"?[{id,participant,record_count:3,answer_count:3,last_saved_at:"2026-01-02"}]:[]}});
  });
  await page.goto("/admin/dashboard");
  await expect(page.getByRole("button",{name:"기존 응답",exact:true})).toHaveAttribute("aria-pressed","true");
  await expect(page.getByRole("heading",{name:"참여자별 응답 현황"})).toBeVisible();
  await expect(page.getByText("회차 기록 3건",{exact:true})).toBeVisible();
  const fits = await page.locator(".table-scroll").evaluate(el => el.scrollWidth <= el.clientWidth);
  expect(fits).toBe(true);
  expect(requests[0]).toBe("legacy");
  await page.getByRole("button",{name:"가상 참여자 응답 상세 보기"}).click();
  await expect(page.getByText("저장된 회차 기록 3건",{exact:true})).toBeVisible();
  await page.getByLabel("회차 선택").selectOption("1");
  await expect(page.locator("dialog .round-details")).toHaveCount(2);
  await page.locator("dialog .round-details summary").nth(1).click();
  await expect(page.getByText("가상 조건 B",{exact:true})).toBeVisible();
  await page.getByLabel("회차 선택").selectOption("2");
  await expect(page.locator("dialog .round-details")).toHaveCount(1);
  await page.locator("dialog .round-details summary").click();
  await expect(page.getByText("가상 조건 C",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"닫기",exact:true}).click();
  await page.screenshot({path:testInfo.outputPath("legacy-people.png"),fullPage:true});
  await page.route("**/api/admin/export*", route => route.fulfill({status:500, json:{error:"CSV 파일을 준비하지 못했습니다."}}));
  await page.getByRole("button",{name:"응답·조건 CSV"}).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("CSV 파일을 준비하지 못했습니다.");
  await expect(page.getByText("회차 기록 3건",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"응답·조건 CSV"})).toBeEnabled();
  await page.getByRole("button",{name:"새 설문",exact:true}).click();
  await expect(page.getByRole("heading",{name:"설문별 진행 현황"})).toBeVisible();
  await expect(page.getByText("검색 조건에 해당하는 응답이 없습니다.")).toBeVisible();
  expect(requests.at(-1)).toBe("v2");
});
