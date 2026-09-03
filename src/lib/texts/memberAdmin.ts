import { money } from "../money";

export const memberEdit = {
  fullNameLabel: "الاسم الكامل",
  paymentMethodLabel: "طريقة الدفع",
  paidAmountLabel: "المبلغ المسدد (أوقية)",
  feeAtLeast: (fee: number) => `${money(fee)} على الأقل`,
  save: "حفظ",
  saving: "جاري الحفظ...",
  uploading: "جاري الرفع...",
  cancel: "إلغاء",
} as const;
