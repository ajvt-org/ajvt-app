import { RETENTION_DAYS } from "../deletedRecords";

export const electionStateLabels = {
  hidden: "مخفي",
  upcoming: "قادم",
  open: "جارٍ",
  ended: "منتهٍ",
} as const;

export const electionAdmin = {
  newElection: "انتخاب جديد",
  empty: "لا توجد انتخابات بعد",
  save: "حفظ",
  saved: "تم الحفظ",
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
  confirmRemoveBody: (title: string) =>
    `يُحذف الانتخاب ${title} بمترشحيه وأصواته. يمكن استرجاعه خلال ${RETENTION_DAYS} يوماً.`,
  titleField: "عنوان الانتخاب للتأكيد",
  extend: "تمديد التصويت",
  reopen: "إعادة فتح التصويت",
  newClose: "موعد الانتهاء الجديد",
  confirmClose: "تأكيد الموعد",
  reopenBody: "تختفي النتيجة عن الأعضاء حتى ينتهي التصويت من جديد",
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
  pick: "اختر مترشحاً واحداً",
  blankTitle: "ورقة بيضاء",
  blankSub: "لا أؤيد أي مترشح",
  confirmVote: "تأكيد التصويت",
  confirmTitle: "تأكيد التصويت",
  confirmFor: (name: string) => `ستصوّت لـ ${name}`,
  confirmBlank: "ستصوّت بورقة بيضاء",
  cannotChange: "لا يمكن تغيير صوتك بعد تأكيده",
  selected: (name: string) => `اخترت ${name}`,
  ended: "انتهى التصويت",
  resultHeld: "لم تعلن النتيجة بعد",
} as const;

export const electionResult = {
  heading: "النتيجة",
  turnout: "نسبة المشاركة",
  cast: "الأصوات المسجلة",
  electorate: "عدد الناخبين",
  blank: "ورقة بيضاء",
  leaderLabel: "المترشح الأول",
  noBallots: "لم يسجل أي صوت",
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

export function durationLabel(minutes: number, spelled: (minutes: number) => string): string {
  return electionDurations.find((one) => one.minutes === minutes)?.label ?? spelled(minutes);
}

export function isPresetDuration(minutes: number): boolean {
  return electionDurations.some(
    (one) => one.minutes !== CUSTOM_ELECTION_DURATION && one.minutes === minutes,
  );
}
