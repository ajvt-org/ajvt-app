export const activityRegistrants = {
  add: "تسجيل عضو يدوياً",
  search: "ابحث بالاسم أو الهاتف...",
  noMatch: "لا يوجد عضو مطابق",
  more: (count: number) => `و${count} غيرهم — حدّد بحثك أكثر`,
  allRegistered: "كل الأعضاء مسجلون في هذا النشاط",
  pending: "طلبات قيد المراجعة",
  confirmed: "مسجَّلون مؤكَّدون",
  noneConfirmed: "لا يوجد مسجلون مؤكَّدون بعد",
  unknownPhone: "غير معروف",
  remove: "إزالة",
  noTeam: "بلا فريق",
  searchRegistrants: "ابحث في المسجلين بالاسم أو الهاتف أو الفريق...",
  noneMatch: "لا يوجد مسجل مطابق",
  viewProof: "عرض إثبات الدفع",
  rejectReason: "سبب الرفض (اختياري)...",
  confirmReject: "تأكيد الرفض",
  cancel: "إلغاء",
  accept: "قبول",
  reject: "رفض",
} as const;

export const registrationStatusLabels: Record<string, string> = {
  PENDING: "قيد الانتظار",
  ACTIVE: "مؤكَّد",
  REJECTED: "مرفوض",
};
