export const memberAccount = {
  none: "لا يوجد حساب مرتبط",
  phoneLabel: "رقم هاتف الحساب الجديد",
  phonePlaceholder: "2XXXXXXX",
  create: "إنشاء حساب",
  reset: "إعادة تعيين",
  busy: "...",
} as const;

export const tempPassword = {
  copy: "نسخ",
  send: "إرسال عبر واتساب",
  message: (password: string, hours: string) =>
    [
      "السلام عليكم",
      "",
      "تم إعداد كلمة مرور مؤقتة لحسابك",
      "في رابطة شباب قرية التاكلالت",
      "",
      password,
      "",
      `صالحة ${hours}`,
      "ويطلب منك تغييرها عند أول دخول",
    ].join("\n"),
} as const;
