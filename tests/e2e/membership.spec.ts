import { test, expect } from "@playwright/test";
import { acceptPayment, openAdmin, signUp, submitMembership } from "./helpers";

const MEMBER = {
  fullName: "محمد ولد اختبار",
  phone: "22119988",
  password: "test1234",
  age: "البدريين",
  paymentMethod: "بنكيلي",
};

const STANDING = {
  fullName: "سيدي ولد الحالة",
  phone: "22119966",
  password: "test1234",
  age: "البدريين",
  paymentMethod: "بنكيلي",
};

const NEIGHBOUR = {
  fullName: "أحمد ولد افجار",
  phone: "22119977",
  password: "test1234",
  village: "أفجار",
  paymentMethod: "بنكيلي",
};

test("a visitor joins and an admin approves them", async ({ page }) => {
  await signUp(page, MEMBER);
  await page.goto("/membership");

  await submitMembership(page, MEMBER.paymentMethod);

  await expect(page.getByText(MEMBER.fullName).first()).toBeVisible();

  const { context: admin, page: adminPage } = await openAdmin(page.context().browser()!);
  await expect(adminPage.getByText(MEMBER.fullName).first()).toBeVisible();

  await acceptPayment(adminPage, MEMBER.fullName);

  await adminPage.getByRole("button", { name: "الكل" }).click();
  await expect(adminPage.locator(".card", { hasText: MEMBER.fullName }).first()).toContainText(
    "معتمد",
  );
  await admin.close();

  await page.goto("/membership");
  await page.waitForURL("**/profile");
});

test("a neighbour from another village joins without an age group", async ({ page }) => {
  await page.goto("/register");
  await page.fill('input[type="tel"]', NEIGHBOUR.phone);
  await page.fill('input[type="password"] >> nth=0', NEIGHBOUR.password);
  await page.fill('input[type="password"] >> nth=1', NEIGHBOUR.password);
  await page.getByRole("button", { name: "التالي" }).click();

  await page.fill('input[name="fullName"]', NEIGHBOUR.fullName);
  await page.selectOption("#signup-village", NEIGHBOUR.village);
  await expect(page.locator("#signup-age")).toHaveCount(0);
  await page.getByRole("button", { name: "إنشاء الحساب" }).click();
  await page.waitForURL("**/home");

  await page.goto("/membership");
  await submitMembership(page, NEIGHBOUR.paymentMethod);

  await expect(page.getByText(NEIGHBOUR.fullName).first()).toBeVisible();
});

test("home tells a new account what it still owes, and where to pay it", async ({ page }) => {
  await signUp(page, STANDING);

  await expect(page.getByText("لم ترسل اشتراكك بعد")).toBeVisible();
  const pay = page.getByRole("link", { name: /إرسال الاشتراك/ });
  await expect(pay).toHaveAttribute("href", "/membership");
  await pay.click();
  await page.waitForURL("**/membership");

  await submitMembership(page, STANDING.paymentMethod);
  await expect(page.getByText(STANDING.fullName).first()).toBeVisible();

  await page.goto("/home");
  await expect(page.getByText("دفعك قيد المراجعة")).toBeVisible();
  await expect(page.getByRole("link", { name: /إرسال الاشتراك/ })).toHaveCount(0);
});
