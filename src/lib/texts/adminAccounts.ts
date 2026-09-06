export const adminAccounts = {
  confirmDelete: "هل أنت متأكد من حذف هذا الحساب؟",
  addTitle: "إضافة مشرف جديد",
  username: "اسم المستخدم",
  password: "كلمة المرور",
  submit: "إضافة",
  submitting: "...",
  you: "أنت",
  changeRole: "تغيير الصلاحية",
  applyRole: "تطبيق",
  applyingRole: "...",
  ownRoleLocked: "لا تُغيَّر صلاحيتك من هنا",
  cancelRole: "إلغاء",
  scope: "تحديد الأنشطة",
  remove: "حذف",
  lastLogin: "آخر دخول",
  neverSignedIn: "لم يسجّل الدخول بعد",
  moreDetails: "تفاصيل الحساب",
  createdAt: "أُنشئ في",
  lastLoginIp: "عنوان آخر دخول",
} as const;

export const activityPicker = {
  title: (username: string) => `أنشطة ${username}`,
  back: "رجوع",
  scope: (roleLabel: string) =>
    `عند الحفظ تصير صلاحية الحساب «${roleLabel}»، فيرى الأنشطة المختارة وحدها ولن يصل إلى بقية لوحة التحكم.`,
  save: "حفظ",
  saving: "...",
} as const;
