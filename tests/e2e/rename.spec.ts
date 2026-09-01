import { test, expect } from "@playwright/test";
import { openAdmin, signUp, submitMembership } from "./helpers";

const MEMBER = {
  fullName: "سالم ولد اختبار",
  corrected: "سالم ولد اختبارو",
  phone: "22115544",
  password: "test1234",
  age: "البدريين",
  paymentMethod: "بنكيلي",
};

test("an admin corrects a name from the list and the log keeps it", async ({ page }) => {
  await signUp(page, MEMBER);
  await page.goto("/membership");

  await submitMembership(page, MEMBER.paymentMethod);
  await expect(page.getByText(MEMBER.fullName).first()).toBeVisible();

  const { context: admin, page: adminPage } = await openAdmin(page.context().browser()!);

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
