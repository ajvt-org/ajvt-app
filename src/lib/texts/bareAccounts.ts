import { counted } from "../arabicCount";
import { DAY } from "../messages";

export const bareAccounts = {
  empty: "لا يوجد أحد بلا طلب",
  noMatch: "لا يوجد حساب مطابق",
  searchPlaceholder: "ابحث بالاسم أو الهاتف...",
  searchLabel: "البحث في الحسابات بلا طلب",
  addedByHand: "أضافه مشرف — لا يملك رقماً للدخول",
  noAgeGroup: "بدون عصر",
  signedUpToday: "سجّل اليوم",
  signedUpAgo: (days: number) => `سجّل منذ ${counted(days, DAY)}`,
  nudge: "تذكير",
  resetPassword: "إعادة تعيين",
  addRequest: "إضافة طلب",
  openProfile: "الملف",
  remove: "حذف",
  busy: "...",
} as const;
