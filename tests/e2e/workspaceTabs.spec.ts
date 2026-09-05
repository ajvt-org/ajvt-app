import { test, expect, type Page } from "@playwright/test";
import { freshName, openAdmin } from "./helpers";

const PHONE = { width: 360, height: 740 };

async function linesWithin(page: Page, strip: number): Promise<number> {
  const centres = await page
    .locator(".admin-page .tab-strip")
    .nth(strip)
    .locator("button")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return Math.round(box.top + box.height / 2);
      }),
    );
  return new Set(centres).size;
}

async function paddingTopOf(page: Page, strip: number): Promise<number> {
  return page
    .locator(".admin-page .tab-strip")
    .nth(strip)
    .evaluate((node) => parseFloat(getComputedStyle(node).paddingTop));
}

async function overflows(page: Page, strip: number): Promise<boolean> {
  return page
    .locator(".admin-page .tab-strip")
    .nth(strip)
    .evaluate((node) => node.scrollWidth > node.clientWidth);
}

test("the workspace tabs hold to one line each on a phone", async ({ browser }) => {
  const { context, page } = await openAdmin(browser);
  await page.setViewportSize(PHONE);

  const id = await page.evaluate(async (title) => {
    const res = await fetch("/api/admin/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: "بطولة القرية",
        isTournament: true,
        format: "KNOCKOUT",
        matchShape: "FOOTBALL",
        minTeamSize: 5,
        maxTeamSize: 5,
      }),
    });
    const body = await res.json();
    return body.activity.id as string;
  }, freshName("بطولة التبويبات"));

  await page.goto(`/admin/activities/${id}`);
  await page.waitForSelector(".admin-page .tab-strip");

  await expect(page.locator(".admin-page .tab-strip")).toHaveCount(2);
  expect(await linesWithin(page, 0)).toBe(1);
  expect(await linesWithin(page, 1)).toBe(1);

  await page.getByRole("button", { name: "المنافسة" }).click();
  await expect(page.getByText("المباريات")).toBeVisible();

  expect(await linesWithin(page, 0)).toBe(1);
  expect(await linesWithin(page, 1)).toBe(1);
  expect(await overflows(page, 1)).toBe(true);

  for (const strip of [0, 1]) {
    expect(await paddingTopOf(page, strip)).toBeGreaterThanOrEqual(6);
  }

  await context.close();
});
