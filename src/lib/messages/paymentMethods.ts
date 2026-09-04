export const paymentMethods = {
  nameRequired: "اسم طريقة الدفع مطلوب",
  nameTooLong: "الاسم طويل جداً (30 حرفاً كحد أقصى)",
  exists: "طريقة الدفع هذه موجودة بالفعل",
  notFound: "طريقة الدفع غير موجودة",
  lastMemberFacing: "لا يمكن إيقاف آخر طريقة متاحة للأعضاء",
} as const;

export const paymentAccounts = {
  codeRequired: "الرقم مطلوب",
  codeTooLong: "الرقم طويل جداً (30 حرفاً كحد أقصى)",
  labelTooLong: "الوصف طويل جداً (30 حرفاً كحد أقصى)",
  exists: "هذا الرقم مسجل في هذه الطريقة",
  notFound: "الرقم غير موجود",
} as const;
