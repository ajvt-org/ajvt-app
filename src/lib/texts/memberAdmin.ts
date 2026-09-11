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

export const membershipEdit = {
  open: "تعديل",
  amount: "المبلغ المسدد (أوقية)",
  paidOn: "تاريخ الدفع",
  paymentMethod: "طريقة الدفع",
  methodUnset: "غير محددة",
  bankReference: "المرجع البنكي",
  save: "حفظ",
  saving: "...",
  cancel: "إلغاء",
  amountRequired: "أدخل المبلغ المسدد. لحذف الدفعة استعمل حذف الدفع نهائياً.",
} as const;
