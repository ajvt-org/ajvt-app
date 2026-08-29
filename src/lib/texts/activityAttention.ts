export const activityAttention = {
  title: "يحتاج انتباهك",
  empty: "لا شيء ينتظرك في الأنشطة",
  oldestFirst: "الأقدم أولاً",
  newestFirst: "الأحدث أولاً",
  show: "عرض",
  hide: "إخفاء",
  kinds: {
    join: "طلب انضمام إلى فريق",
    registration: "طلب تسجيل في نشاط",
    suspension: "عقوبة مقترحة",
  },
  today: "اليوم",
  waiting: (days: number) => `منذ ${days} يوم`,
  open: "فتح",
} as const;
