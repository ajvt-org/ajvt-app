export const admins = {
  usernameTooLong: "اسم المستخدم طويل جداً (30 حرفاً كحد أقصى)",
  usernameTaken: "اسم المستخدم مستخدم بالفعل",
  cannotDeleteSelf: "لا يمكنك حذف حسابك الخاص",
  cannotDeleteLast: "لا يمكن حذف آخر حساب مشرف",
  notFound: "المشرف غير موجود",
  ownerRoleReserved: "صلاحية المالك لا تُمنح ولا تُسحب إلا من المالك",
  cannotChangeOwnRole: "لا يمكنك تغيير صلاحية حسابك الخاص",
  cannotDemoteLastOwner:
    "لا يمكن سحب صلاحية المالك من آخر مالك، فلا يمنحها إلا مالك ولن يبقى من يعيدها",
  unknownRole: "صلاحية غير معروفة",
  scopedRoleSetByActivities: "صلاحية الأنشطة المحددة تُضبط بتحديد الأنشطة للحساب",
  pickOneActivity: "اختر نشاطاً واحداً على الأقل",
  cannotScopeSelf: "لا يمكنك حصر حسابك الخاص في نشاط",
  activityNotFound: "نشاط غير موجود",
} as const;
