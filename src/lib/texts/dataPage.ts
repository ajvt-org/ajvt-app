export const dataPage = {
  visitsTab: "الزيارات",
  exportTab: "التصدير",
} as const;

export const siteVisits = {
  title: "إحصائيات الزيارات",
  today: "زوار اليوم",
  yesterday: "زوار الأمس",
  last7Days: "آخر 7 أيام",
  last30Days: "آخر 30 يوماً",
  chartTitle: "تطور عدد الزوار يوميّاً (آخر 30 يوماً)",
  empty: "لا توجد زيارات مسجلة بعد",
  dailyTitle: "التفاصيل اليومية",
  visitors: (count: number) => `${count} زائر`,
  pageViews: (count: number) => `${count} مشاهدة`,
  dayReading: (day: string, visitors: number, pageViews: number) =>
    `${day} — ${visitors} زائر (${pageViews} مشاهدة)`,
} as const;

export const dataExport = {
  title: "تصدير البيانات",
  members: "الانتساب",
  donations: "الدعم",
  ages: "الأعصار",
} as const;
