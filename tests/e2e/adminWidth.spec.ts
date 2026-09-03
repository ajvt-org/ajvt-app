import { test, expect, type Page } from "@playwright/test";
import { freshName, openAdmin } from "./helpers";

const PHONE = { width: 360, height: 740 };

async function widerThanTheScreen(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const shell = document.documentElement;
    return shell.scrollWidth > shell.clientWidth;
  });
}

async function pushedOffScreen(page: Page, label: string): Promise<boolean> {
  return page
    .getByRole("button", { name: label })
    .first()
    .evaluate((node) => {
      const box = node.getBoundingClientRect();
      return box.left < 0 || box.right > document.documentElement.clientWidth;
    });
}

async function addActivity(page: Page, title: string) {
  await page.evaluate(async (name) => {
    await fetch("/api/admin/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: name, description: "نشاط لقياس عرض الصفحة" }),
    });
  }, title);
}

test("the admin shell holds its width on a phone", async ({ browser }) => {
  const { context, page } = await openAdmin(browser);
  await page.setViewportSize(PHONE);

  await addActivity(page, freshName("نشاط العرض الأول"));
  await addActivity(page, freshName("نشاط العرض الأخير"));

  await page.goto("/admin/activities");
  const menus = page.locator('button[aria-label^="خيارات"]');
  await expect(menus.first()).toBeVisible();

  expect(await widerThanTheScreen(page)).toBe(false);

  for (const menu of [menus.first(), menus.last()]) {
    await menu.scrollIntoViewIfNeeded();
    await menu.click();
    await expect(page.getByRole("button", { name: "نسخ النشاط" }).first()).toBeVisible();

    expect(await widerThanTheScreen(page)).toBe(false);
    expect(await pushedOffScreen(page, "خروج")).toBe(false);

    await menu.click();
  }

  const strip = page.locator(".tab-strip").first();
  expect(await strip.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  expect(await widerThanTheScreen(page)).toBe(false);

  await context.close();
});
