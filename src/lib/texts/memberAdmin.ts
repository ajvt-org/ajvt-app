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

export const yearAmount = {
  unset: (year: number) => `لم يُسجَّل مبلغ لسنة ${year}`,
  edit: (year: number) => `تعديل مبلغ سنة ${year}`,
  amountLabel: "المبلغ المسدد",
  saving: "جارٍ الحفظ",
  save: "حفظ",
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
  feeOnThisPayment: (fee: number) => `رسوم الانتساب على هذه الدفعة ${money(fee)}`,
  shortfallTitle: "المبلغ أقل من الرسوم",
  shortfallConsequence: (name: string, year: number) =>
    `يُسجَّل المبلغ كما أدخلته، وتنتهي عضوية ${name} لسنة ${year} بسبب نقص المبلغ.`,
  shortfallProceed: "احفظ وأنهِ العضوية",
  restoreTitle: "المبلغ يغطي الرسوم",
  restoreOffer: (name: string, year: number) =>
    `عضوية ${name} لسنة ${year} أُنهيت لنقص المبلغ. المبلغ الآن يغطي الرسوم، ويمكن إرجاع العضوية.`,
  restoreProceed: "أرجع العضوية",
  restoreDecline: "اترك العضوية منتهية",
} as const;
