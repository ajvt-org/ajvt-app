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
