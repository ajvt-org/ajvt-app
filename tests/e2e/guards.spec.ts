import { test, expect } from "@playwright/test";

test("the admin dashboard is not reachable without signing in", async ({ page }) => {
  await page.goto("/admin/dashboard");

  await page.waitForURL("**/admin/login**");
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("a wrong admin password does not sign you in", async ({ page }) => {
  await page.goto("/admin/login");
  await page.fill('input[type="text"]', "admin");
  await page.fill('input[type="password"]', "not-the-password");
  await page.click('button[type="submit"]');

  await expect(page.getByText("اسم المستخدم أو كلمة المرور غير صحيحة")).toBeVisible();
  expect(page.url()).toContain("/admin/login");
});
