export const settingsPage = {
  title: "إعدادات الرابطة",
  saved: "تم الحفظ",
  save: "حفظ",
  saving: "جارٍ الحفظ...",
  exportTitle: "تصدير البيانات",
  exportMembers: "الانتساب",
  exportDonations: "الدعم",
  exportAges: "الأعصار",
} as const;

export const settingsForm = {
  membershipFeeLabel: "رسم العضوية (أوقية)",
  membershipFeeHint: "المبلغ الأدنى المقبول في استمارة الانضمام.",
  membershipYearLabel: "سنة العضوية الجارية",
  membershipYearHint: "السنة التي تُسجَّل عليها طلبات الانضمام الجديدة.",
  tempPasswordHoursLabel: "صلاحية كلمة المرور المؤقتة (ساعة)",
  tempPasswordHoursHint:
    "بعد هذه المدة تتوقف كلمة المرور المؤقتة عن العمل ويحتاج العضو إلى واحدة جديدة.",
  supportWhatsappLabel: "رقم واتساب الدعم",
  supportWhatsappHint: "يُستعمل في صفحة استعادة كلمة المرور، مع رمز الدولة ودون علامة +.",
  whatsappGroupLabel: "رابط مجموعة الواتساب",
  secretaryNameLabel: "اسم الأمين العام",
  treasurerNameLabel: "اسم مسؤول المالية",
  officerHint: "يُطبع على وصل القبض مكان التوقيع.",
} as const;
