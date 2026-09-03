export const donationEdit = {
  proof: "إثبات الدفع",
  donorPhoto: "صورة المتبرع",
  donorPhotoOptional: "صورة المتبرع (اختياري)",
  donorName: "اسم المتبرع",
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
  confirmRemove: "هل أنت متأكد من حذف هذا التبرع نهائياً؟ لا يمكن التراجع عن هذا الإجراء.",
} as const;
