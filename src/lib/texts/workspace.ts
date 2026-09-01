export const activityWorkspace = {
  loading: "جاري التحميل...",
  notFound: "لم نجد هذا النشاط.",
  backToIndex: "الأنشطة",
  capacity: "السعة",
  acceptedOfRequests: (accepted: string, requests: string) => `${accepted} من ${requests}`,
  publicPage: "الصفحة العامة",
  sections: {
    setup: "الإعداد",
    people: "المشاركون",
    play: "المنافسة",
    records: "السجلات",
  },
  tabs: {
    details: "التفاصيل",
    registrations: "المسجلون",
    teams: "الفرق",
    players: "اللاعبون",
    days: "الأيام",
    matches: "المباريات",
    standings: "الترتيب",
    scorers: "الإحصائيات",
    finance: "المالية",
    log: "السجل",
  },
} as const;

export const tournamentWorkspace = {
  fallbackTitle: "البطولة",
  loadFailed: "فشل تحميل بيانات البطولة",
} as const;
