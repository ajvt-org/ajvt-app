import { ouguiya } from "../texts/currency";

export const settings = {
  officerNameTooLong: "الاسم طويل جداً",
  whatsappInvalid: "رقم الواتساب غير صالح",
  groupLinkInvalid: "الرابط غير صالح",
  feeAudit: (amount: number) => ouguiya.amount(amount),
} as const;
