export const paymentMethodManager = {
  title: "طرق الدفع",
  newPlaceholder: "طريقة دفع جديدة",
  newLabel: "اسم طريقة الدفع الجديدة",
  add: "إضافة",
  renameLabel: "الاسم الجديد",
  save: "حفظ",
  cancel: "إلغاء",
  empty: "لا توجد طرق دفع بعد",
  memberFacing: "متاحة للأعضاء",
  adminOnly: "للإدارة فقط",
  stopped: "موقوفة",
  stop: "إيقاف",
  resume: "إعادة تفعيل",
  moveUp: "تحريك لأعلى",
  moveDown: "تحريك لأسفل",
  edit: (name: string) => `تعديل ${name}`,
  toggleActive: (name: string) => `إيقاف أو تفعيل ${name}`,
  toggleMemberFacing: (name: string) => `إتاحة ${name} للأعضاء`,
  hint: "طريقة الدفع لا تُحذف، تُوقف فقط، حتى تبقى السجلات القديمة سليمة.",
} as const;

export const paymentMethodChoice = {
  failed: "تعذر تحميل طرق الدفع، أعد تحميل الصفحة",
  none: "لا توجد طريقة دفع متاحة حالياً",
} as const;

export const paymentInfoBanner = {
  title: "معلومات الدفع",
  copy: "نسخ",
  copied: "تم",
  failed: "تعذر تحميل أرقام الدفع، أعد تحميل الصفحة",
  none: "لا توجد طريقة دفع متاحة حالياً",
} as const;
