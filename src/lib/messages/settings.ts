import { money } from "../money";

export const settings = {
  officerNameTooLong: "الاسم طويل جداً",
  whatsappInvalid: "رقم الواتساب غير صالح",
  groupLinkInvalid: "الرابط غير صالح",
  feeAudit: (amount: number) => money(amount),
} as const;
