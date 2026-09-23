import { test, expect, type Locator, type Page } from "@playwright/test";
import { freshName, openAdmin } from "./helpers";

async function createTournament(page: Page, title: string): Promise<string> {
  return page.evaluate(async (name) => {
    const created = await fetch("/api/admin/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: name,
        description: "بطولة القرية",
        isTournament: true,
        format: "GROUPS_THEN_KNOCKOUT",
        matchShape: "FOOTBALL",
      }),
    });
    const { activity } = await created.json();
    await fetch(`/api/admin/activities/${activity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: true }),
    });
    return activity.id as string;
  }, title);
}

async function openTab(page: Page, section: string, tab: string) {
  await page.getByRole("button", { name: section }).click();
  await page.locator(".admin-page .tab-strip").last().getByRole("button", { name: tab }).click();
}

async function addTeam(page: Page, name: string) {
  await page.getByPlaceholder("اسم الفريق الجديد").fill(name);
  await page.getByRole("button", { name: "فريق", exact: true }).click();
  await expect(page.getByText(name).first()).toBeVisible();
}

async function standings(table: Locator): Promise<string[][]> {
  return table
    .locator("tbody tr")
    .evaluateAll((rows) =>
      rows.map((row) => [...row.querySelectorAll("td")].map((cell) => cell.textContent!.trim())),
    );
}

test("a tournament goes from its teams to the standings a member reads", async ({ browser }) => {
  const { context, page } = await openAdmin(browser);
  const home = freshName("نجوم الوادي");
  const away = freshName("شباب الواحة");
  const id = await createTournament(page, freshName("دوري القرية"));

  await page.goto(`/admin/activities/${id}`);
  await openTab(page, "المشاركون", "الفرق");
  await addTeam(page, home);
  await addTeam(page, away);

  await openTab(page, "المنافسة", "المباريات");
  await page.getByText("مباراة جديدة").click();
  const form = page.locator("details").filter({ hasText: "مباراة جديدة" });
  await form.locator("select").nth(0).selectOption({ label: home });
  await form.locator("select").nth(1).selectOption({ label: away });
  await form.getByRole("button", { name: "إضافة المباراة" }).click();

  await page.getByRole("button", { name: "أدخل النتيجة" }).click();
  const team = page.getByLabel("الفريق", { exact: true }).first();
  const addGoal = page.getByRole("button", { name: "إضافة الهدف" }).first();
  await team.selectOption({ label: home });
  await addGoal.click();
  await addGoal.click();
  await team.selectOption({ label: away });
  await addGoal.click();
  await page.getByRole("button", { name: "حفظ النتيجة" }).click();
  await expect(page.getByRole("button", { name: "أدخل النتيجة" })).toHaveCount(0);

  await openTab(page, "المنافسة", "الترتيب");
  const adminTable = page.locator(".admin-page table").first();
  await expect(adminTable).toContainText(home);
  expect((await standings(adminTable)).map((row) => [row[1], row[2], row[3]])).toEqual([
    [home, "3", "1"],
    [away, "0", "1"],
  ]);

  const member = await browser.newContext();
  const visitor = await member.newPage();
  await visitor.goto(`/activities/${id}`);
  await visitor.getByRole("tab", { name: "الترتيب" }).click();
  const publicTable = visitor.locator("table").first();
  await expect(publicTable).toContainText(home);
  expect(await standings(publicTable)).toEqual([
    ["1", home, "3", "1", "1", "0", "0", "2", "1", "1"],
    ["2", away, "0", "1", "0", "0", "1", "1", "2", "-1"],
  ]);

  await member.close();
  await context.close();
});
