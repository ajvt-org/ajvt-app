import { resetTournament } from "./activityDetail";

export const setupLabels = {
  round: (round: number) => `الجولة ${round}`,
  groupRound: (groupName: string, round: number) => `${groupName} — ${setupLabels.round(round)}`,
  groupName: (index: number) => `المجموعة ${index + 1}`,
} as const;

export const setupWizard = {
  open: "إعداد البطولة",
  title: "إعداد البطولة",
  back: "رجوع",
  next: "التالي",
  write: "اعتماد الجدول",
  writing: "...",
  done: "أُعدت البطولة بالكامل",

  steps: {
    shape: "الشكل",
    groups: "المجموعات",
    schedule: "جدول المجموعات",
    bracket: "الأدوار الإقصائية",
    dates: "المواعيد",
  },

  stepOf: (at: number, total: number) => `الخطوة ${at} من ${total}`,

  tooFewTeams: "أضف فريقين على الأقل قبل إعداد البطولة",
  hasResults: (played: number) =>
    `سُجلت نتائج في ${played} مباراة. استخدم «${resetTournament.action}» من تبويب التفاصيل لإعادة البطولة إلى فرقها، ثم أعد الإعداد من هنا`,

  formatLabel: "شكل البطولة",
  knockout: "إقصاء مباشر",
  groupsThenKnockout: "مجموعات ثم إقصاء",
  groupCountLabel: "عدد المجموعات",
  qualifierCountLabel: "عدد المتأهلين",
  groupOption: (groupCount: number, groupSize: number) =>
    `${groupCount} مجموعات، ${groupSize} فرق لكل مجموعة`,
  qualifierOption: (qualifierCount: number, perGroup: number) =>
    `${qualifierCount} متأهلاً، ${perGroup} من كل مجموعة`,

  drawTitle: "القرعة المقترحة",
  reshuffle: "إعادة القرعة",
  swapWith: "بدّل مع",
  cancelSwap: "إلغاء التبديل",

  scheduleTitle: "جدول المجموعات",
  scheduleHint: "تُلعب جولة واحدة عبر كل المجموعات قبل الانتقال إلى الجولة التالية",
  roundTitle: (round: number) => `الجولة ${round}`,

  bracketTitle: "الأدوار الإقصائية",
  bracketHint: "المقاعد فقط، لأن المجموعات لم تُلعب بعد",
  slot: (position: number, groupName: string) => `${position} ${groupName}`,
  versus: "ضد",
  byeSeats: (count: number) => `${count} من مقاعد الدور الأول بلا خصم، وتمرّ إلى الدور التالي`,

  datesTitle: "المواعيد",
  firstDay: "أول يوم",
  matchTimes: "أوقات المباريات في اليوم",
  addTime: "إضافة وقت",
  removeTime: "إزالة هذا الوقت",
  venue: "الملعب",
  venueOptional: "اختياري",
  lastDay: (days: number) => `تحتاج البطولة ${days} يوماً`,
  backToBackDays:
    "الأيام متتالية بلا راحة بينها، ويمكن إضافة أيام راحة من تبويب الأيام بعد الإنشاء",

  replaceWarning: "سيُحذف ما سبق من مجموعات ومباريات غير ملعوبة ويُستبدل بهذا الجدول",
} as const;
