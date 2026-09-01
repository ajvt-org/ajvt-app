import { countedNoun, DAYS } from "../arabicPlural";

export const bareAccounts = {
  lead: "أشخاص بلا اشتراك: سجّلوا في التطبيق ولم يدفعوا بعد، أو أضافهم مشرف يدوياً.",
  empty: "لا يوجد أحد بلا اشتراك",
  addedByHand: "أضافه مشرف — لا يملك رقماً للدخول",
  noAgeGroup: "بدون عصر",
  signedUpToday: "سجّل اليوم",
  signedUpAgo: (days: number) => `سجّل منذ ${countedNoun(days, DAYS)}`,
  nudge: "تذكير",
  resetPassword: "إعادة تعيين",
  addRequest: "إضافة طلب",
  remove: "حذف",
} as const;
