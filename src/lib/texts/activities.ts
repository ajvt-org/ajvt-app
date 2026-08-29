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
