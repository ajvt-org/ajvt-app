export const receipts = {
  payerRequired: "الجهة الدافعة مطلوبة",
  payerTooLong: "اسم الجهة الدافعة طويل جداً (80 حرفاً كحد أقصى)",
  reasonRequired: "موجب القبض مطلوب",
  reasonTooLong: "موجب القبض طويل جداً (120 حرفاً كحد أقصى)",
  voidReasonRequired: "سبب الإلغاء مطلوب",
  notFound: "الوصل غير موجود أو ملغى من قبل",
  withdrawnOnRefusal: "أُلغي الدفع بعد قبوله",
  replacedAfterCorrection: (number: string) => `صُحّح المبلغ، والبديل هو الوصل ${number}`,
  correctedPending: "صُحّح المبلغ، وسيصدر وصل بديل",
} as const;
