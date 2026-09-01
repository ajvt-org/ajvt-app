export const convertTournament = {
  heading: "وضع البطولة",
  hint: "حوّل النشاط إلى بطولة ليحصل على فرق ومباريات وترتيب.",
  editSettings: "تعديل الإعدادات",
  unconvert: "إلغاء وضع البطولة",
  convert: "تحويل إلى بطولة",
  dialogTitle: "تحويل إلى بطولة",
  settingsTitle: "إعدادات البطولة",
  lockHint: "النظام والنوع وحجم الفريق تُقفل جميعاً بعد إنشاء أول مباراة.",
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

export const activityFinance = {
  heading: (count: number) => `المالية (${count})`,
  income: "الإيرادات",
  expenses: "المصاريف",
  balance: "الرصيد",
  empty: "لا توجد حركات مالية على هذا النشاط",
} as const;

export const activityLog = {
  heading: "سجل التغييرات",
  empty: "لا توجد تغييرات مسجلة",
} as const;
