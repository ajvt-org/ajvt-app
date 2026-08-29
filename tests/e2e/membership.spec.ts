import { test, expect, type Page } from "@playwright/test";

// A 1x1 png is enough: the route only checks that the upload is a real image.
const PROOF = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const MEMBER = {
  fullName: "محمد ولد اختبار",
  phone: "22119988",
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

interface Person {
  phone: string;
  password: string;
  fullName: string;
  village?: string;
  age?: string;
}

async function signUp(page: Page, person: Person) {
  await page.goto("/register");

  await page.fill('input[type="tel"]', person.phone);
  await page.fill('input[type="password"] >> nth=0', person.password);
  await page.fill('input[type="password"] >> nth=1', person.password);
  await page.getByRole("button", { name: "التالي" }).click();

  await page.fill('input[name="fullName"]', person.fullName);
  if (person.village) await page.selectOption("#signup-village", person.village);
  if (person.age) await page.selectOption("#signup-age", person.age);
  await page.getByRole("button", { name: "إنشاء الحساب" }).click();
  await page.waitForURL("**/home");
}

test("a visitor joins and an admin approves them", async ({ page }) => {
  await signUp(page, MEMBER);
  await page.goto("/membership");

  await page.click(`text=${MEMBER.paymentMethod}`);
  await page.fill('input[type="number"]', "100");
  await page
    .locator('input[type="file"]')
    .last()
    .setInputFiles({ name: "proof.png", mimeType: "image/png", buffer: PROOF });
  await page.getByRole("button", { name: "إرسال طلب الانضمام" }).click();

  await expect(page.getByText(MEMBER.fullName).first()).toBeVisible();

  const admin = await page.context().browser()!.newContext();
  const adminPage = await admin.newPage();
  await adminPage.goto("/admin/login");
  await adminPage.fill('input[type="text"]', "admin");
  await adminPage.fill('input[type="password"]', "admin123");
  await adminPage.click('button[type="submit"]');

  await adminPage.waitForURL("**/admin");
  await adminPage.goto("/admin/dashboard");
  await expect(adminPage.getByText(MEMBER.fullName).first()).toBeVisible();

  await adminPage.getByText(MEMBER.fullName).first().click();
  await adminPage.getByRole("button", { name: "قبول الدفع", exact: true }).click();

  await adminPage.getByRole("button", { name: "الكل" }).click();
  await expect(adminPage.locator(".card", { hasText: MEMBER.fullName }).first()).toContainText(
    "معتمد",
  );
  await admin.close();

  // The account now holds a membership, so the payment screen has nothing left
  // to ask: a second request is what put a rejection on an approved account.
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
  await page.click(`text=${NEIGHBOUR.paymentMethod}`);
  await page.fill('input[type="number"]', "100");
  await page
    .locator('input[type="file"]')
    .last()
    .setInputFiles({ name: "proof.png", mimeType: "image/png", buffer: PROOF });
  await page.getByRole("button", { name: "إرسال طلب الانضمام" }).click();

  await expect(page.getByText(NEIGHBOUR.fullName).first()).toBeVisible();
});
