export const membershipForm = {
  joinNote: "الاشتراك في الرابطة هو ما يتيح لك المشاركة في الأنشطة والفعاليات",
  donateInstead: "تريد فقط دعم الرابطة دون الانضمام كعضو؟",
  donateLink: "تبرّع من هنا",
  shareText: (code: string) => `رقم دفتري في رابطة شباب قرية التاكلالت: ${code}`,
} as const;

export const membershipSubmitted = {
  sentRenewal: "تم إرسال التجديد بنجاح",
  sentEdits: "تم إرسال التعديلات بنجاح",
  sent: "تم إرسال طلبك بنجاح",
  reviewSoon: "سيراجع فريق الرابطة طلبك خلال أقل من ساعة",
  referenceLabel: "رقم دفترك، احتفظ به للمتابعة",
  copy: "نسخ",
  copied: "تم النسخ",
  summary: "ملخص الطلب",
  name: "الاسم",
  method: "طريقة الدفع",
  amount: "المبلغ",
  shareReference: "مشاركة رقم الدفتر",
  toProfile: "الذهاب إلى حسابي",
} as const;
