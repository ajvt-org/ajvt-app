export const AMOUNT_BELOW_FEE = "صُحّح المبلغ إلى أقل من رسوم الانتساب";

export const MEMBERSHIP_ENDING_REASONS = [
  "استُرجعت رسوم الانتساب",
  AMOUNT_BELOW_FEE,
  "مخالفة النظام الداخلي",
] as const;

export const membershipEnding = {
  end: "إنهاء العضوية",
  endTitle: "إنهاء العضوية",
  endSubject: (name: string, year: number) => `عضوية ${name} لسنة ${year}.`,
  endMeaning: "تتوقف العضوية لهذه السنة، ويحتفظ الشخص بحسابه وبسجله كاملاً.",
  endConfirm: "تأكيد الإنهاء",
  reasonLabel: "سبب إنهاء العضوية",
  restore: "إرجاع العضوية",
  restoreTitle: "إرجاع العضوية",
  restoreSubject: (name: string, year: number) => `إرجاع عضوية ${name} لسنة ${year}.`,
  restoreUndoes: "الإنهاء الذي سيُرجَع",
  restoreConfirm: "تأكيد الإرجاع",
  cancel: "إلغاء",
  endedOn: "تاريخ الإنهاء",
  endedBy: "أنهاها",
  endedReason: "السبب",
} as const;
