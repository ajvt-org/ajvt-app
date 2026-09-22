export const electionStateLabels = {
  hidden: "مخفي",
  upcoming: "لم يبدأ بعد",
  open: "التصويت جار",
  ended: "انتهى",
} as const;

export const electionAdmin = {
  newElection: "انتخاب جديد",
  empty: "لا توجد انتخابات بعد",
  save: "حفظ",
  saved: "تم الحفظ",
  frozen: "انطلق التصويت. التوقيت والمترشحون والخيارات مغلقة، ويبقى نشر النتيجة بيدك",
  title: "عنوان الانتخاب",
  hidden: "إخفاء الانتخاب",
  startsAt: "بداية التصويت",
  duration: "مدة التصويت",
  customDuration: "المدة بالدقائق",
  allowBlank: "السماح بالورقة البيضاء",
  shuffle: "ترتيب عشوائي للمترشحين",
  showResults: "إظهار النتيجة بعد انتهاء التصويت",
  closesAt: "ينتهي التصويت",
  from: "من",
  to: "إلى",
  remove: "حذف الانتخاب",
  confirmRemove: "حذف الانتخاب",
  confirmRemoveBody: (title: string) => `سيحذف الانتخاب ${title} نهائياً`,
  yes: "نعم",
  no: "لا",
} as const;

export const CUSTOM_ELECTION_DURATION = -1;

export const electionDurations = [
  { minutes: 60, label: "ساعة" },
  { minutes: 360, label: "ست ساعات" },
  { minutes: 720, label: "اثنتا عشرة ساعة" },
  { minutes: 1440, label: "يوم" },
  { minutes: 2880, label: "يومان" },
  { minutes: 4320, label: "ثلاثة أيام" },
  { minutes: 10080, label: "أسبوع" },
  { minutes: CUSTOM_ELECTION_DURATION, label: "مدة أخرى" },
] as const;

export function durationLabel(minutes: number): string {
  return electionDurations.find((one) => one.minutes === minutes)?.label ?? `${minutes}`;
}

export function isPresetDuration(minutes: number): boolean {
  return electionDurations.some(
    (one) => one.minutes !== CUSTOM_ELECTION_DURATION && one.minutes === minutes,
  );
}
