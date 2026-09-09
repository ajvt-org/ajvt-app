import { donationForm } from "./donationForm";

export const donationEdit = {
  ...donationForm,
  shownAs: "يظهر باسم",
  linkedTo: "مرتبط بحساب",
  link: "ربط بعضو مسجل",
  changeLink: "تغيير الربط",
  save: "حفظ",
  cancel: "إلغاء",
} as const;

export const donationActions = {
  accept: "قبول",
  refuse: "رفض",
  revoke: "إبطال التبرع",
  restore: "إعادة تفعيل",
  edit: "تعديل",
  classify: "تصنيف",
  noTags: "لا توجد تصنيفات بعد",
  remove: "حذف نهائياً",
  confirmRemove: "هل أنت متأكد من حذف هذا التبرع نهائياً؟ لا يمكن التراجع عن هذا الإجراء.",
} as const;
