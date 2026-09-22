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

export const electionCandidates = {
  heading: "المترشحون",
  add: "إضافة مترشح",
  empty: "لا يوجد مترشحون بعد",
  fullName: "الاسم الكامل",
  photo: "الصورة",
  save: "حفظ",
  cancel: "إلغاء",
  editOne: (name: string) => `تعديل ${name}`,
  removeOne: (name: string) => `حذف ${name}`,
  confirmRemove: "حذف المترشح",
  confirmRemoveBody: (name: string) => `سيحذف ${name} من قائمة المترشحين`,
  frozen: "انطلق التصويت، قائمة المترشحين مغلقة",
} as const;

export const electionMember = {
  cardTitle: "الانتخابات",
  cardSub: "اطلع على الانتخابات وصوّت",
  cardAction: "افتح",
  listTitle: "الانتخابات",
  empty: "لا توجد انتخابات حالياً",
  startsIn: "يبدأ التصويت بعد",
  startsInLabel: "الوقت المتبقي لبداية التصويت",
  endsIn: "ينتهي التصويت بعد",
  endsInLabel: "الوقت المتبقي لانتهاء التصويت",
  windowLabel: "ما تبقى من مدة التصويت",
  startsOn: "يبدأ",
  endedOn: "انتهى التصويت في",
  voted: "صوّتّ",
  candidates: "المترشحون",
  noCandidates: "لم تعلن أسماء المترشحين بعد",
  membersOnly: "التصويت للمنتسبين فقط",
  signInToVote: "سجّل الدخول للتصويت",
  signIn: "تسجيل الدخول",
  notFound: "الانتخاب غير موجود",
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
