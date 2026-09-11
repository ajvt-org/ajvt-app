export const AMOUNT_BELOW_FEE = "صُحّح المبلغ إلى أقل من رسوم الانتساب";

export const MEMBERSHIP_ENDING_REASONS = [
  "استُرجعت رسوم الانتساب",
  AMOUNT_BELOW_FEE,
  "مخالفة النظام الداخلي",
] as const;

export const membershipEnding = {
  end: "إنهاء العضوية",
  endConfirm: "تأكيد الإنهاء",
  reasonLabel: "سبب إنهاء العضوية",
  restore: "إرجاع العضوية",
  cancel: "إلغاء",
  endedOn: "تاريخ الإنهاء",
  endedBy: "أنهاها",
  endedReason: "السبب",
} as const;
