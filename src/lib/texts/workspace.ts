export const activityWorkspace = {
  loading: "جاري التحميل...",
  notFound: "لم نجد هذا النشاط.",
  backToIndex: "الأنشطة",
  capacity: "السعة",
  tabs: {
    details: "التفاصيل",
    registrations: "المسجلون",
    tournament: "البطولة",
    finance: "المالية",
    log: "السجل",
  },
} as const;

export const tournamentWorkspace = {
  fallbackTitle: "البطولة",
  backToActivity: "النشاط",
  publicPage: "الصفحة العامة",
  loadFailed: "فشل تحميل بيانات البطولة",
  tabs: {
    teams: "الفرق",
    players: "اللاعبون",
    days: "الأيام",
    matches: "المباريات",
    standings: "الترتيب",
    scorers: "الإحصائيات",
  },
} as const;
