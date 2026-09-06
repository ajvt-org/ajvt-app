export const pendingAgeGroups = {
  title: "أعصار مقترحة من الأعضاء",
  intro: "لا تظهر هذه الأعصار لبقية الأعضاء حتى تقبلها.",
  approve: "قبول",
  reject: "حذف",
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
