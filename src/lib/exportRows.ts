import type { AgeStanding } from "./ageStandings";

export const DATASETS = ["members", "donations", "ages"] as const;
export type Dataset = (typeof DATASETS)[number];

export function isDataset(value: string): value is Dataset {
  return (DATASETS as readonly string[]).includes(value);
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "قيد الانتظار",
  ACTIVE: "معتمد",
  REJECTED: "غير مقبول",
};

const SOURCE_LABEL: Record<string, string> = {
  PUBLIC: "عام",
  SELF: "من حساب",
  MEMBERSHIP: "فائض انتساب",
};

export interface ExportableMember {
  fullName: string;
  age: string;
  paymentMethod: string;
  paidAmount: number | null;
  supportAmount?: number;
  status: string;
  memberNumber: string | null;
  referenceCode: string | null;
  createdAt: Date;
  user: { phone: string } | null;
}

export interface ExportableDonation {
  donorName: string | null;
  donorPhone: string | null;
  amount: number | null;
  paymentMethod: string | null;
  status: string;
  source: string;
  createdAt: Date;
  member: { fullName: string } | null;
  tags: { name: string }[];
}

// A payment records what it was for, not where it came from, so the source
// column is read back off it: a membership payment is a surplus, and anything
// else is a member's own gift or a gift from outside.
export function sourceOf(purpose: string, memberId: string | null): string {
  if (purpose === "MEMBERSHIP") return "MEMBERSHIP";
  return memberId ? "SELF" : "PUBLIC";
}

function day(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const MEMBER_HEADERS = [
  "الاسم الكامل",
  "رقم الهاتف",
  "العصر",
  "طريقة الدفع",
  "رسوم الاشتراك",
  "مبلغ الدعم",
  "إجمالي ما دُفع",
  "الحالة",
  "رقم العضوية",
  "رمز الطلب",
  "تاريخ الانتساب",
];

export function memberRows(members: ExportableMember[]): (string | number)[][] {
  return members.map((m) => [
    m.fullName,
    m.user?.phone ?? "",
    m.age,
    m.paymentMethod,
    m.paidAmount ?? 0,
    m.supportAmount ?? 0,
    (m.paidAmount ?? 0) + (m.supportAmount ?? 0),
    STATUS_LABEL[m.status] ?? m.status,
    m.memberNumber ?? "",
    m.referenceCode ?? "",
    day(m.createdAt),
  ]);
}

export const DONATION_HEADERS = [
  "المتبرع",
  "رقم الهاتف",
  "المبلغ",
  "طريقة الدفع",
  "الحالة",
  "المصدر",
  "العضو المرتبط",
  "التصنيفات",
  "التاريخ",
];

export function donationRows(donations: ExportableDonation[]): (string | number)[][] {
  return donations.map((d) => [
    d.donorName ?? "فاعل خير",
    d.donorPhone ?? "",
    d.amount ?? 0,
    d.paymentMethod ?? "",
    STATUS_LABEL[d.status] ?? d.status,
    SOURCE_LABEL[d.source] ?? d.source,
    d.member?.fullName ?? "",
    d.tags.map((t) => t.name).join(" / "),
    day(d.createdAt),
  ]);
}

export const AGE_HEADERS = ["العصر", "عدد المنتسبين", "العدد الإجمالي", "نسبة الانتساب"];

export function ageRows(standings: AgeStanding[]): (string | number)[][] {
  return standings.map((s) => [s.name, s.members, s.total, `${s.rate}%`]);
}

export const FILENAMES: Record<Dataset, string> = {
  members: "members",
  donations: "donations",
  ages: "age-groups",
};
