export const memberStatusLabels = {
  PENDING: "قيد الانتظار",
  ACTIVE: "معتمد",
  REJECTED: "الدفع مرفوض",
} as const;

export const members = {
  statusTransition: (from: string, to: string) => ` (من ${from} إلى ${to})`,
  notFound: "العضو غير موجود",
  requestNotFound: "الطلب غير موجود",
  fullNameRequired: "الاسم الكامل مطلوب",
  fullNameTooLong: "الاسم الكامل طويل جداً (30 حرفاً كحد أقصى)",
  fullNameArabicOnly: "الاسم الكامل يجب أن يكون بالحروف العربية فقط",
  pickAgeGroup: "يرجى اختيار العصر",
  profileIncomplete: "أكمل بيانات حسابك قبل إرسال طلب الانتساب",
  pickPaymentMethod: "يرجى اختيار طريقة الدفع",
  attachProof: "يرجى إرفاق صورة الكابتير",
  waitForUpload: "يرجى الانتظار حتى انتهاء رفع الصورة",
  statusInvalid: "حالة غير صالحة",
  rejectionReasonRequired: "سبب رفض الدفع مطلوب",
  rejectionReasonInvalid: "سبب رفض الدفع غير صالح",
  alreadyHasRequest: "لديك طلب انضمام بالفعل، يمكنك تعديله بدل إرسال طلب جديد",
  alreadyAccepted: "هذا العضو مقبول بالفعل",
  invalidMember: "عضو غير صالح",
  alreadyHasAccount: "لهذا العضو حساب مسبقاً",
  accountAlreadyHasMember: "لهذا الحساب عضو مسبقاً",
  accountPhoneTaken: "هذا الرقم مستعمل لحساب آخر",
  noAccountToCorrect: "لا يوجد حساب لهذا العضو",
  yearInvalid: "سنة العضوية غير صالحة",
  renewNotActive: "لا يمكن تجديد عضوية غير مقبولة",
  renewUnderReview: "الاشتراك الحالي قيد المراجعة",
  renewNotIssued: "لا يوجد رقم عضوية لتجديده",
  renewAlreadyDone: "العضوية مجددة لهذه السنة بالفعل",
  renewYearBehind: "عضوية هذا العضو تتجاوز السنة الجارية",
  photoLocked: "تغيير الصورة موقوف على هذا الحساب، راجع إدارة الرابطة",
} as const;

export const ageGroups = {
  nameRequired: "اسم العصر مطلوب",
  nameTooLong: "اسم العصر طويل جداً (30 حرفاً كحد أقصى)",
  alreadyExists: "هذا العصر موجود بالفعل",
} as const;
