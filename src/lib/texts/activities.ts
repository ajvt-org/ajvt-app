import { countedNoun, MATCHES } from "../arabicPlural";
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
  showScorersAndCards: "عرض الهدافين والبطاقات الحمراء",
  showScorersAndCardsHint:
    "بطاقة المباراة تعرض الهدافين والبطاقات الحمراء. عند الإطفاء تبقى النتيجة ورجل المباراة والمجريات.",
  detailsHeading: "تفاصيل النشاط",
  title: "العنوان",
  description: "الوصف",
  capacity: "السعة",
  noCapacity: "بدون حد",
  whatsappLink: "رابط الواتساب",
  photoHeading: "الصورة",
  save: "حفظ التفاصيل",
  saved: "تم حفظ التفاصيل",
  datesHeading: "التواريخ",
} as const;

export const convertCampaign = {
  heading: "وضع الحملة التطوعية",
  hint: "حوّل النشاط إلى حملة تطوعية بمجموعة واتساب يلتحق بها المتطوعون.",
  isCampaign: "النشاط حملة تطوعية.",
  convert: "تحويل إلى حملة تطوعية",
  confirm: "تأكيد التحويل",
  unconvert: "إلغاء وضع الحملة",
  dialogTitle: "تحويل إلى حملة تطوعية",
  whatsappLabel: "رابط مجموعة الواتساب",
  pendingHeading: (n: number) =>
    n === 1 ? "طلب تسجيل واحد ما يزال في الانتظار" : `${n} طلبات تسجيل ما تزال في الانتظار`,
  pendingHint: "الحملة التطوعية لا تدير طلبات التسجيل، فاحسم ما ينتظر قبل التحويل.",
  acceptAll: "اقبلها كلها",
  rejectAll: "ارفضها كلها",
  converted: "أصبح النشاط حملة تطوعية",
  unconverted: "لم يعد النشاط حملة تطوعية",
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
  draftChip: "مسودة",
  publish: "نشر النشاط",
  unpublish: "إخفاء من صفحات الأعضاء",
  openRegistration: "فتح التسجيل",
  closeRegistration: "إغلاق التسجيل",
  duplicate: "نسخ النشاط",
  duplicated: "أُنشئت نسخة كمسودة",
  pickRow: (title: string) => `تحديد ${title}`,
  picked: (n: number) => `${n} محدَّد`,
  bulkClose: "إغلاق التسجيل",
  bulkDelete: "حذف",
  bulkClear: "إلغاء التحديد",
  bulkFailed: (n: number) => `تعذّر تنفيذ ${n} منها`,
  bulkDeleteTitle: "حذف الأنشطة المحدَّدة",
  bulkDeleteMessage: (n: number) =>
    `سيُحذف ${n} نشاطاً نهائياً، ومعها تسجيلات الأعضاء وفرقها ومبارياتها.`,
  bulkDeleteConfirm: "حذف نهائي",
  arrangeLink: "ترتيب الظهور",
  arrangeTitle: "ترتيب ظهور الأنشطة",
  arrangeNote:
    "المرحلة تُقرَّر أولاً: الجاري ثم القادم ثم المنتهي. الأسهم ترتّب النشاط داخل مرحلته فقط.",
  arrangeBack: "الأنشطة",
  arrangeEmpty: "لا توجد أنشطة لترتيبها",
  stages: {
    live: "جارية الآن",
    awaiting: "لم تنته بعد",
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
  awaiting: (count: number) => `بقيت ${countedNoun(count, MATCHES)}`,
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
