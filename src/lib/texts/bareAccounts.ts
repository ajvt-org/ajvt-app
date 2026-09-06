import { countedNoun, DAYS } from "../arabicPlural";

export const bareAccounts = {
  empty: "لا يوجد أحد بلا طلب",
  addedByHand: "أضافه مشرف — لا يملك رقماً للدخول",
  noAgeGroup: "بدون عصر",
  signedUpToday: "سجّل اليوم",
  signedUpAgo: (days: number) => `سجّل منذ ${countedNoun(days, DAYS)}`,
  nudge: "تذكير",
  resetPassword: "إعادة تعيين",
  addRequest: "إضافة طلب",
  remove: "حذف",
} as const;
