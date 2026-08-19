import { test, expect } from "@playwright/test";

// A 1x1 png is enough: the route only checks that the upload is a real image.
const PROOF = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const MEMBER = {
  fullName: "سالم ولد اختبار",
  corrected: "سالم ولد اختبارو",
  phone: "22115544",
  password: "test1234",
  age: "البدريين",
  paymentMethod: "بنكيلي",
};

test("an admin corrects a name from the list and the log keeps it", async ({ page }) => {
  await page.goto("/form");

  await page.fill('input[name="fullName"]', MEMBER.fullName);
  await page.fill('input[type="tel"]', MEMBER.phone);
  await page.selectOption("select", MEMBER.age);
  await page.getByRole("button", { name: "التالي" }).click();

  await page.fill('input[type="password"] >> nth=0', MEMBER.password);
  await page.fill('input[type="password"] >> nth=1', MEMBER.password);
  await page.getByRole("button", { name: "التالي" }).click();

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
  await adminPage.waitForURL("**/admin/dashboard");

  await adminPage.getByRole("button", { name: `تعديل اسم ${MEMBER.fullName}` }).click();
  const field = adminPage.getByRole("textbox", { name: "الاسم", exact: true });
  await field.fill(MEMBER.corrected);
  await adminPage.getByRole("button", { name: "حفظ" }).click();

  await expect(adminPage.getByText(MEMBER.corrected).first()).toBeVisible();
  await expect(adminPage.getByText("تفاصيل الطلب")).toHaveCount(0);

  await adminPage.reload();
  await expect(adminPage.getByText(MEMBER.corrected).first()).toBeVisible();

  await adminPage.goto("/admin/audit-log");
  await expect(adminPage.getByText(`${MEMBER.fullName} → ${MEMBER.corrected}`)).toBeVisible();

  await admin.close();
});
