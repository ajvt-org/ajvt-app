export const activityForm = {
  natures: {
    normal: "نشاط عادي",
    tournament: "بطولة",
    volunteer: "حملة تطوعية",
  },
  natureHeading: "نوع النشاط",
  titlePlaceholder: "عنوان النشاط",
  descriptionPlaceholder: "الوصف",
  from: "من",
  to: "إلى",
  capacityPlaceholder: "السعة القصوى (اختياري)",
  whatsappPlaceholder: "رابط مجموعة الواتساب — https://chat.whatsapp.com/...",
  tournamentLogo: "شعار البطولة",
  activityPhoto: "صورة النشاط",
  submit: "إضافة",
  registrationOpen: "التسجيل مفتوح",
  autoApprove: "قبول التسجيل تلقائياً",
  autoApproveHint: "المنتسب يلتحق بالنشاط مباشرة دون انتظار موافقة المشرف.",
} as const;

export const activityRow = {
  pendingChip: (n: number) => `${n} في الانتظار`,
  joinRequestChip: (n: number) => `${n} طلب انضمام`,
  filters: {
    anyType: "كل الأنواع",
    tournament: "بطولات",
    volunteer: "حملات",
    plain: "أنشطة عادية",
    anyState: "الكل",
    open: "التسجيل مفتوح",
    closed: "التسجيل مغلق",
  },
  sections: {
    current: "جارية وقادمة",
    finished: (n: number) => `منتهية (${n})`,
  },
  registeredOf: (registered: number, capacity: number) => `${registered} من ${capacity}`,
  rowMenu: (title: string) => `خيارات ${title}`,
  arrangeLink: "ترتيب الظهور",
  arrangeTitle: "ترتيب ظهور الأنشطة",
  arrangeNote:
    "المرحلة تُقرَّر أولاً: الجاري ثم القادم ثم المنتهي. الأسهم ترتّب النشاط داخل مرحلته فقط.",
  arrangeBack: "الأنشطة",
  arrangeEmpty: "لا توجد أنشطة لترتيبها",
  stages: {
    live: "جارية الآن",
    upcoming: "قادمة",
    undatedOpen: "بلا تاريخ — التسجيل مفتوح",
    undatedClosed: "بلا تاريخ — التسجيل مغلق",
    finished: "منتهية",
  },
  orderHint:
    "الأسهم ترتّب النشاط داخل مجموعته على صفحات الأعضاء. الجاري ثم القادم ثم المنتهي، وهذا الترتيب لا يتغيّر.",
  tournamentChip: "بطولة",
  volunteerChip: "حملة تطوعية",
  closedChip: "التسجيل مغلق",
  manageTournament: "إدارة البطولة",
  moveUp: (title: string) => `تقديم ${title} في الترتيب`,
  moveDown: (title: string) => `تأخير ${title} في الترتيب`,
} as const;

export const activityStandingTexts = {
  startsToday: "يبدأ اليوم",
  startsTomorrow: "يبدأ غداً",
  startsIn: (days: number) =>
    days === 2 ? "يبدأ بعد يومين" : days <= 10 ? `يبدأ بعد ${days} أيام` : `يبدأ بعد ${days} يوماً`,
  running: "جارٍ الآن",
  finished: "انتهى",
  notScheduled: "غير مبرمج بعد",
} as const;

export const tournamentSetup = {
  presetHeading: "نوع البطولة",
  presets: {
    football: "بطولة فرق",
    board: "بطولة فردية",
    cards: "بطولة أزواج",
  },
  formatHeading: "نظام البطولة",
  formats: {
    KNOCKOUT: "خروج المغلوب مباشرة",
    GROUPS_THEN_KNOCKOUT: "مجموعات ثم خروج المغلوب",
  },
} as const;
