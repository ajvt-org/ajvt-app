export const AMOUNT_BELOW_FEE = "صُحّح المبلغ إلى أقل من رسوم الانتساب";

export const MEMBERSHIP_ENDING_REASONS = [
  "استُرجعت رسوم الانتساب",
  AMOUNT_BELOW_FEE,
  "مخالفة النظام الداخلي",
  "وفاة",
  "مغادرة المنطقة",
  "انسحاب بطلب من العضو",
  "تسجيل مكرر",
  "لم تعد شروط العضوية متوفرة",
] as const;

export const membershipEnding = {
  end: "إنهاء العضوية",
  endTitle: "إنهاء العضوية",
  endSubject: (name: string, year: number) => `عضوية ${name} لسنة ${year}.`,
  endMeaning: "تتوقف العضوية لهذه السنة، ويحتفظ الشخص بحسابه وبسجله كاملاً.",
  endConfirm: "تأكيد الإنهاء",
  reasonLabel: "سبب إنهاء العضوية",
  otherReason: "سبب آخر",
  writtenLabel: "اكتب السبب",
  restore: "إرجاع العضوية",
  restoreTitle: "إرجاع العضوية",
  restoreSubject: (name: string, year: number) => `إرجاع عضوية ${name} لسنة ${year}.`,
  restoreUndoes: "الإنهاء الذي سيُرجَع",
  restoreConfirm: "تأكيد الإرجاع",
  cancel: "إلغاء",
  endedOn: "تاريخ الإنهاء",
  endedBy: "أنهاها",
  endedReason: "السبب",
  restoredOn: "تاريخ الإرجاع",
  restoredBy: "أرجعها",
  broughtBack: "إنهاءات أُرجعت",
} as const;
