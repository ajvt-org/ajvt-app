import { test, expect } from "@playwright/test";
import { acceptPayment, attachProof, freshPerson, openAdmin, signUp } from "./helpers";

const BASE_MEMBER = {
  fullName: "أحمد ولد الفائض",
  password: "test1234",
  age: "البدريين",
  paymentMethod: "بنكيلي",
};

const QUESTION = "هل تريد ذكر اسمك مع التبرع؟";

test("a member who pays above the fee says how the surplus appears", async ({ page }) => {
  const member = freshPerson(BASE_MEMBER);

  await signUp(page, member);
  await page.goto("/membership");

  await page.click(`text=${member.paymentMethod}`);

  await page.fill('input[type="number"]', "100");
  await expect(page.getByText(QUESTION)).toHaveCount(0);

  await page.fill('input[type="number"]', "300");
  await expect(page.getByText(QUESTION)).toBeVisible();

  await attachProof(page);

  await page.getByRole("button", { name: "إرسال طلب الانضمام" }).click();
  await expect(page.getByText("يرجى اختيار كيف تظهر مساهمتك")).toBeVisible();

  await page.getByRole("radio", { name: "أفضّل أن أبقى مجهولاً" }).click();
  await page.getByRole("button", { name: "إرسال طلب الانضمام" }).click();
  await expect(page.getByText(member.fullName).first()).toBeVisible();

  const { context: admin, page: adminPage } = await openAdmin(page.context().browser()!);

  await acceptPayment(adminPage, member.fullName);
  await expect(adminPage.getByText(member.fullName).first()).toBeVisible();

  async function board() {
    const res = await adminPage.request.get("/api/leaderboard");
    return JSON.stringify(await res.json());
  }

  await expect.poll(board).toContain("فاعل خير");
  expect(await board()).not.toContain(member.fullName);

  await page.goto("/profile");
  await page.getByRole("radio", { name: new RegExp(member.fullName) }).click();
  await expect(page.getByText("تم الحفظ")).toBeVisible();

  await expect.poll(board).toContain(member.fullName);

  await admin.close();
});
