import { ouguiya } from "./currency";

export const convertTournament = {
  heading: "وضع البطولة",
  hint: "حوّل النشاط إلى بطولة ليحصل على فرق ومباريات وترتيب.",
  editSettings: "تعديل الإعدادات",
  unconvert: "إلغاء وضع البطولة",
  convert: "تحويل إلى بطولة",
  dialogTitle: "تحويل إلى بطولة",
  settingsTitle: "إعدادات البطولة",
  lockHint: "النظام والنوع يُقفلان بعد إنشاء أول مباراة، وحجم الفريق بعد انطلاق البطولة.",
  saveSettings: "حفظ الإعدادات",
  settingsSaved: "حُفظت إعدادات البطولة",
  converted: "أصبح النشاط بطولة",
  unconverted: "لم يعد النشاط بطولة",
} as const;

export const deleteActivity = {
  heading: "حذف النشاط",
  hint: "يحذف النشاط ويلغي تسجيل جميع الأعضاء فيه.",
  action: "حذف النشاط نهائياً",
  confirmTitle: "حذف النشاط",
  confirmMessage: "هل أنت متأكد من حذف هذا النشاط؟ سيتم إلغاء تسجيل جميع الأعضاء فيه.",
  confirmLabel: "حذف نهائي",
} as const;

export const resetTournament = {
  heading: "تصفير البطولة",
  hint: "يعيد البطولة إلى فرقها وحدها، ليمكن إعدادها من جديد بالمعالج.",
  action: "تصفير البطولة",
  confirmTitle: "تصفير البطولة",
  confirmLabel: "احذف وابدأ من جديد",
  goesHeading: "سيُحذف نهائياً",
  staysHeading: "يبقى كما هو",
  stays: "الفرق وتشكيلاتها وتسجيلات المشاركين",
  alreadyClear: "لا يوجد ما يُحذف، البطولة عند فرقها بالفعل.",
  countsFailed: "تعذّر قراءة ما سيُحذف",
  done: "أُعيدت البطولة إلى فرقها",
} as const;

export const activityFinance = {
  heading: (count: number) => `المالية (${count})`,
  income: `الإيرادات (${ouguiya.singular})`,
  expenses: `المصاريف (${ouguiya.singular})`,
  balance: `الرصيد (${ouguiya.singular})`,
  empty: "لا توجد حركات مالية على هذا النشاط",
} as const;

export const activityLog = {
  heading: "سجل التغييرات",
  empty: "لا توجد تغييرات مسجلة",
} as const;

export const activityDatesEditor = {
  legacyPeriod: (period: string) =>
    `هذا النشاط يعرض نصاً قديماً: ${period} — حدّد التواريخ ليحل محله`,
  from: "من",
  to: "إلى",
  withTime: "تحديد الساعة",
  preview: (formatted: string) => `سيظهر هكذا: ${formatted}`,
  save: "حفظ التواريخ",
} as const;
