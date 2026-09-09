import { donationForm } from "./donationForm";

export const manualDonation = {
  ...donationForm,
  title: "تسجيل تبرع يدوياً",
  intro: "لتبرع تلقيته خارج التطبيق نقداً أو تحويلاً — يُحتسب مباشرة في لوحة شرف المتبرعين.",
  account: "الحساب المرتبط (اختياري)",
  accountHint: "اربطه بحساب العضو ليظهر باسمه على اللوحة",
  submit: "تسجيل التبرع",
} as const;
