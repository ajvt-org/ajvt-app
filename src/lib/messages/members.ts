export const members = {
  notFound: "العضو غير موجود",
  requestNotFound: "الطلب غير موجود",
  fullNameRequired: "الاسم الكامل مطلوب",
  fullNameTooLong: "الاسم الكامل طويل جداً (30 حرفاً كحد أقصى)",
  pickAgeGroup: "يرجى اختيار العصر",
  pickPaymentMethod: "يرجى اختيار طريقة الدفع",
  approved: "مقبول",
  rejected: "غير مقبول",
  rejectionReasonRequired: "سبب الرفض مطلوب",
  alreadyHasRequest: "لديك طلب انضمام بالفعل، يمكنك تعديله بدل إرسال طلب جديد",
  accountAlreadyHasMember: "لهذا الحساب عضو مسبقاً",
} as const;

export const ageGroups = {
  nameRequired: "اسم العصر مطلوب",
  nameTooLong: "اسم العصر طويل جداً (30 حرفاً كحد أقصى)",
  alreadyExists: "هذا العصر موجود بالفعل",
} as const;
