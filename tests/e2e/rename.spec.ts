import { test, expect } from "@playwright/test";
import { freshName, freshPerson, openAdmin, signUp, submitMembership } from "./helpers";

const BASE_MEMBER = {
  fullName: "سالم ولد اختبار",
  corrected: "سالم ولد اختبارو",
  password: "test1234",
  age: "البدريين",
  paymentMethod: "بنكيلي",
};

test("an admin corrects a name from the list and the log keeps it", async ({ page }) => {
  const member = freshPerson(BASE_MEMBER);
  const corrected = freshName(BASE_MEMBER.corrected);

  await signUp(page, member);
  await page.goto("/membership");

  await submitMembership(page, member.paymentMethod);
  await expect(page.getByText(member.fullName).first()).toBeVisible();

  const { context: admin, page: adminPage } = await openAdmin(page.context().browser()!);

  await adminPage.getByRole("button", { name: `تعديل اسم ${member.fullName}` }).click();
  const field = adminPage.getByRole("textbox", { name: "الاسم", exact: true });
  await field.fill(corrected);
  await adminPage.getByRole("button", { name: "حفظ" }).click();

  await expect(adminPage.getByText(corrected).first()).toBeVisible();
  await expect(adminPage.getByText("تفاصيل الطلب")).toHaveCount(0);

  await adminPage.reload();
  await expect(adminPage.getByText(corrected).first()).toBeVisible();

  await adminPage.goto("/admin/audit-log");
  await expect(adminPage.getByText(`${member.fullName} → ${corrected}`)).toBeVisible();

  await admin.close();
});
