import { test, expect } from "@playwright/test";

// A 1x1 png is enough: the route only checks that the upload is a real image.
const PROOF = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const MEMBER = {
  fullName: "أحمد ولد الفائض",
  phone: "22117766",
  password: "test1234",
  age: "البدريين",
  paymentMethod: "بنكيلي",
};

const QUESTION = "هل تريد ذكر اسمك مع التبرع؟";

test("a member who pays above the fee says how the surplus appears", async ({ page }) => {
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
  await expect(page.getByText(QUESTION)).toHaveCount(0);

  await page.fill('input[type="number"]', "300");
  await expect(page.getByText(QUESTION)).toBeVisible();

  await page
    .locator('input[type="file"]')
    .last()
    .setInputFiles({ name: "proof.png", mimeType: "image/png", buffer: PROOF });

  await page.getByRole("button", { name: "إرسال طلب الانضمام" }).click();
  await expect(page.getByText("يرجى اختيار كيف تظهر مساهمتك")).toBeVisible();

  await page.getByRole("radio", { name: "أفضّل أن أبقى مجهولاً" }).click();
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

  await adminPage.getByText(MEMBER.fullName).first().click();
  await adminPage.getByRole("button", { name: "قبول", exact: true }).click();
  await expect(adminPage.getByText(MEMBER.fullName).first()).toBeVisible();

  async function board() {
    const res = await adminPage.request.get("/api/leaderboard");
    return JSON.stringify(await res.json());
  }

  await expect.poll(board).toContain("فاعل خير");
  expect(await board()).not.toContain(MEMBER.fullName);

  await page.goto("/profile");
  await page.getByRole("radio", { name: new RegExp(MEMBER.fullName) }).click();
  await expect(page.getByText("تم الحفظ")).toBeVisible();

  await expect.poll(board).toContain(MEMBER.fullName);

  await admin.close();
});
