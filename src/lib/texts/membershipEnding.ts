export const MEMBERSHIP_ENDING_REASONS = [
  "استُرجعت رسوم الانتساب",
  "مخالفة النظام الداخلي",
] as const;

export const membershipEnding = {
  title: "العضوية",
  end: "إنهاء العضوية",
  endConfirm: "تأكيد الإنهاء",
  reasonLabel: "سبب إنهاء العضوية",
  restore: "إرجاع العضوية",
  cancel: "إلغاء",
  ended: (year: number) => `عضوية سنة ${year} منتهية`,
  standing: (year: number) => `عضوية سنة ${year} قائمة`,
  endedOn: "تاريخ الإنهاء",
  endedBy: "أنهاها",
  endedReason: "السبب",
} as const;
