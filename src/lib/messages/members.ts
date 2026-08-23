export const members = {
  notFound: "العضو غير موجود",
  requestNotFound: "الطلب غير موجود",
  fullNameRequired: "الاسم الكامل مطلوب",
  fullNameTooLong: "الاسم الكامل طويل جداً (30 حرفاً كحد أقصى)",
  pickAgeGroup: "يرجى اختيار العصر",
  pickPaymentMethod: "يرجى اختيار طريقة الدفع",
  approved: "معتمد",
  rejected: "غير مقبول",
  rejectionReasonRequired: "سبب الرفض مطلوب",
  alreadyHasRequest: "لديك طلب انضمام بالفعل، يمكنك تعديله بدل إرسال طلب جديد",
  accountAlreadyHasMember: "لهذا الحساب عضو مسبقاً",
  accountPhoneTaken: "هذا الرقم مستعمل لحساب آخر",
  noAccountToCorrect: "لا يوجد حساب لهذا العضو",
  yearInvalid: "سنة العضوية غير صالحة",
  renewNotActive: "لا يمكن تجديد عضوية غير مقبولة",
  renewNotIssued: "لا يوجد رقم عضوية لتجديده",
  renewAlreadyDone: "العضوية مجددة لهذه السنة بالفعل",
  renewYearBehind: "عضوية هذا العضو تتجاوز السنة الجارية",
} as const;

export const ageGroups = {
  nameRequired: "اسم العصر مطلوب",
  nameTooLong: "اسم العصر طويل جداً (30 حرفاً كحد أقصى)",
  alreadyExists: "هذا العصر موجود بالفعل",
} as const;
