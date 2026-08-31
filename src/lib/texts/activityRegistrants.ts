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
} as const;

export const registrationStatusLabels: Record<string, string> = {
  PENDING: "قيد الانتظار",
  ACTIVE: "مقبول",
  REJECTED: "غير مقبول",
};
