export const pendingAgeGroups = {
  title: "أعصار مقترحة من الأعضاء",
  approve: "قبول",
  reject: "حذف",
  confirmRejectTitle: "حذف عصر مقترح",
  confirmReject: "حذف هذا العصر المقترح؟ الأعضاء الذين اختاروه يحتفظون به.",
} as const;

export const ageStandings = {
  title: "ترتيب الأعصار",
  empty: "لا توجد أعصار بعد",
  joined: (people: string, groups: string) => `${people} في ${groups}`,
  sorts: {
    rate: "نسبة المنتسبين",
    members: "عدد المنتسبين",
    userRate: "نسبة الحسابات",
    users: "عدد الحسابات",
    total: "العدد الإجمالي",
  },
} as const;

export const ageGroupsDialog = {
  title: "إدارة الأعصار",
  addPlaceholder: "اسم عصر جديد...",
  add: "إضافة",
  save: "حفظ",
  cancel: "إلغاء",
  empty: "لا توجد أعصار مسجلة بعد",
  move: "نقل",
  edit: "تعديل",
  confirmDeleteTitle: "حذف عصر",
  delete: "حذف",
  confirmDelete: "هل أنت متأكد من حذف هذا العصر من القائمة؟ لن يؤثر ذلك على الأعضاء الحاليين.",
} as const;

export const moveAgeGroup = {
  intro: (members: string) => `نقل ${members} إلى عصر آخر`,
  pick: "اختر العصر...",
  move: "نقل",
  cancel: "إلغاء",
  confirmTitle: "نقل الأعضاء",
  confirmMove: (from: string, to: string) => `نقل كل أعضاء "${from}" إلى "${to}"؟`,
} as const;

export const orphanAgeGroups = {
  title: "أعصار لدى أعضاء ولا توجد في القائمة",
  intro: "اختر العصر الصحيح لكل واحد منها لنقل أعضائه إليه.",
  pick: "اختر العصر الصحيح...",
  move: "نقل",
} as const;

export const ageGroupTotal = {
  label: "العدد الإجمالي",
  save: "حفظ",
} as const;
