export const memberAccount = {
  none: "لا يوجد حساب مرتبط",
  phoneLabel: "رقم هاتف الحساب الجديد",
  phonePlaceholder: "2XXXXXXX",
  create: "إنشاء حساب",
  reset: "إعادة تعيين",
  busy: "...",
} as const;

export const tempPassword = {
  handOver: "كلمة المرور المؤقتة — سلّمها للعضو",
  validFor: (hours: string) => `صالحة ${hours}، وسيُطلب منه تغييرها عند الدخول`,
  copy: "نسخ",
} as const;
