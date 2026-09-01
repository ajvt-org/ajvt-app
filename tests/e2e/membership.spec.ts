import { test, expect } from "@playwright/test";
import { acceptPayment, freshPerson, openAdmin, signUp, submitMembership } from "./helpers";

const BASE_MEMBER = {
  fullName: "محمد ولد اختبار",
  password: "test1234",
  age: "البدريين",
  paymentMethod: "بنكيلي",
};

const BASE_STANDING = {
  fullName: "سيدي ولد الحالة",
  password: "test1234",
  age: "البدريين",
  paymentMethod: "بنكيلي",
};

const BASE_NEIGHBOUR = {
  fullName: "أحمد ولد افجار",
  password: "test1234",
  village: "أفجار",
  paymentMethod: "بنكيلي",
};

test("a visitor joins and an admin approves them", async ({ page }) => {
  const member = freshPerson(BASE_MEMBER);

  await signUp(page, member);
  await page.goto("/membership");

  await submitMembership(page, member.paymentMethod);

  await expect(page.getByText(member.fullName).first()).toBeVisible();

  const { context: admin, page: adminPage } = await openAdmin(page.context().browser()!);
  await expect(adminPage.getByText(member.fullName).first()).toBeVisible();

  await acceptPayment(adminPage, member.fullName);

  await adminPage.getByRole("button", { name: "الكل" }).click();
  await expect(adminPage.locator(".card", { hasText: member.fullName }).first()).toContainText(
    "معتمد",
  );
  await admin.close();

  await page.goto("/membership");
  await page.waitForURL("**/profile");
});

test("a neighbour from another village joins without an age group", async ({ page }) => {
  const neighbour = freshPerson(BASE_NEIGHBOUR);

  await page.goto("/register");
  await page.fill('input[type="tel"]', neighbour.phone);
  await page.fill('input[type="password"] >> nth=0', neighbour.password);
  await page.fill('input[type="password"] >> nth=1', neighbour.password);
  await page.getByRole("button", { name: "التالي" }).click();

  await page.fill('input[name="fullName"]', neighbour.fullName);
  await page.selectOption("#signup-village", neighbour.village);
  await expect(page.locator("#signup-age")).toHaveCount(0);
  await page.getByRole("button", { name: "إنشاء الحساب" }).click();
  await page.waitForURL("**/home");

  await page.goto("/membership");
  await submitMembership(page, neighbour.paymentMethod);

  await expect(page.getByText(neighbour.fullName).first()).toBeVisible();
});

test("home tells a new account what it still owes, and where to pay it", async ({ page }) => {
  const standing = freshPerson(BASE_STANDING);

  await signUp(page, standing);

  await expect(page.getByText("لم ترسل اشتراكك بعد")).toBeVisible();
  const pay = page.getByRole("link", { name: /إرسال الاشتراك/ });
  await expect(pay).toHaveAttribute("href", "/membership");
  await pay.click();
  await page.waitForURL("**/membership");

  await submitMembership(page, standing.paymentMethod);
  await expect(page.getByText(standing.fullName).first()).toBeVisible();

  await page.goto("/home");
  await expect(page.getByText("دفعك قيد المراجعة")).toBeVisible();
  await expect(page.getByRole("link", { name: /إرسال الاشتراك/ })).toHaveCount(0);
});
