export const adminTools = {
  backToTools: "الأدوات",
  password: "تغيير كلمة المرور",
  admins: "حسابات المشرفين",
  auditLog: "سجل الإجراءات",
  broadcast: "إرسال إشعار جماعي",
  deleted: "سلة المحذوفات",
} as const;

export const deletedRecords = {
  note: (kind: string, deletedBy: string, daysLeft: string) =>
    `${kind} · حذفه ${deletedBy} · يُمحى نهائياً خلال ${daysLeft}`,
  restore: "استرجاع",
  empty: "السلة فارغة",
} as const;

export const auditLogPage = {
  noMatch: "لا يوجد سجل مطابق",
} as const;
