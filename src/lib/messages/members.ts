export const members = {
  notFound: "العضو غير موجود",
  requestNotFound: "الطلب غير موجود",
  fullNameRequired: "الاسم الكامل مطلوب",
  fullNameTooLong: "الاسم الكامل طويل جداً (30 حرفاً كحد أقصى)",
  pickAgeGroup: "يرجى اختيار العصر",
  pickPaymentMethod: "يرجى اختيار طريقة الدفع",
  approved: "مقبول",
  rejected: "غير مقبول",
} as const;

export const ageGroups = {
  nameRequired: "اسم العصر مطلوب",
  nameTooLong: "اسم العصر طويل جداً (30 حرفاً كحد أقصى)",
  alreadyExists: "هذا العصر موجود بالفعل",
} as const;
