export const donationEdit = {
  proof: "إثبات الدفع",
  donorPhoto: "صورة المتبرع",
  donorPhotoOptional: "صورة المتبرع (اختياري)",
  donorName: "اسم المتبرع",
  storedName: "الاسم المكتوب يدوياً",
  storedNameHint: "يظهر إن أُلغي الربط بالحساب",
  shownAs: "يظهر باسم",
  linkedTo: "مرتبط بحساب",
  link: "ربط بعضو مسجل",
  changeLink: "تغيير الربط",
  unlink: "إلغاء الربط",
  anonymous: "إظهاره باسم فاعل خير",
  phone: "رقم الهاتف (اختياري)",
  amount: "المبلغ",
  methodUnset: "طريقة الدفع — غير محددة",
  save: "حفظ",
  cancel: "إلغاء",
} as const;

export const donationActions = {
  accept: "قبول",
  refuse: "رفض",
  revoke: "إبطال التبرع",
  restore: "إعادة تفعيل",
  edit: "تعديل",
  remove: "حذف نهائياً",
} as const;
