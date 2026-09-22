export const electionStateLabels = {
  hidden: "مخفي",
  upcoming: "لم يبدأ بعد",
  open: "التصويت جار",
  ended: "انتهى",
} as const;

export const electionAdmin = {
  title: "الانتخابات",
  add: "انتخاب جديد",
  empty: "لا توجد انتخابات",
  save: "حفظ",
  cancel: "إلغاء",
  edit: "تعديل",
  remove: "حذف",
  titleField: "عنوان الانتخاب",
  hiddenField: "إخفاء الانتخاب",
  startsAtField: "بداية التصويت",
  durationField: "مدة التصويت",
  allowBlankField: "السماح بالورقة البيضاء",
  shuffleField: "ترتيب عشوائي للمترشحين",
  showResultsField: "إظهار النتيجة بعد انتهاء التصويت",
  closesAt: (at: string) => `ينتهي التصويت في ${at}`,
  startsAtReadOnly: "بداية التصويت",
  confirmDeleteTitle: "حذف الانتخاب",
  confirmDeleteBody: (name: string) => `سيحذف الانتخاب ${name} نهائياً`,
} as const;

export const electionDurations = [
  { minutes: 60, label: "ساعة" },
  { minutes: 360, label: "ست ساعات" },
  { minutes: 720, label: "اثنتا عشرة ساعة" },
  { minutes: 1440, label: "يوم" },
  { minutes: 2880, label: "يومان" },
  { minutes: 4320, label: "ثلاثة أيام" },
  { minutes: 10080, label: "أسبوع" },
] as const;
