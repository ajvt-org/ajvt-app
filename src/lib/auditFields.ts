import { ROLE_LABELS } from "./adminRoles";
import { memberStatusLabels } from "@/lib/messages";

// Field and value names as they appear inside before/after snapshots. An
// unknown key falls through to its raw name rather than disappearing, so a
// route that starts recording a new field still shows it.
const FIELD_LABELS: Record<string, string> = {
  fullName: "الاسم الكامل",
  name: "الاسم",
  phone: "رقم الهاتف",
  age: "العصر",
  status: "الحالة",
  memberNumber: "رقم العضوية",
  rejectionReason: "سبب الرفض",
  paymentMethod: "طريقة الدفع",
  paidAmount: "المبلغ المسدد",
  paymentProof: "إثبات الدفع",
  referenceCode: "الرمز المرجعي",
  photo: "الصورة",
  role: "الصلاحية",
  username: "اسم المستخدم",
  label: "الوصف",
  amount: "المبلغ",
  note: "ملاحظة",
  date: "التاريخ",
  title: "العنوان",
  whatsappLink: "رابط الواتساب",
  startsAt: "تاريخ البداية",
  endsAt: "تاريخ النهاية",
  withTime: "تحديد الساعة",
  membersRenamed: "الأعضاء المحدَّثون",
};

const VALUE_LABELS: Record<string, string> = {
  PENDING: "قيد المراجعة",
  ACTIVE: memberStatusLabels.ACTIVE,
  REJECTED: memberStatusLabels.REJECTED,
  ...ROLE_LABELS,
};

const TARGET_LABELS: Record<string, string> = {
  Member: "عضو",
  User: "حساب",
  Admin: "مشرف",
  AgeGroup: "عصر",
  Activity: "نشاط",
  Team: "فريق",
  Match: "مباراة",
  Expense: "مصروف",
  Donation: "تبرع",
  Question: "سؤال",
};

export function auditFieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

export function auditTargetLabel(type: string): string {
  return TARGET_LABELS[type] ?? type;
}

export function auditValueLabel(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  return VALUE_LABELS[text] ?? text;
}
