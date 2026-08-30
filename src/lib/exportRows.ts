import { memberStatusLabels } from "./messages";
import { donorNameOnRecord } from "./donorName";
import { nameOf } from "./person";
import type { AgeStanding } from "./ageStandings";
import type { ActivityReportRow } from "./activityReport";
import { activityReport } from "./texts/activityReport";

export const DATASETS = ["members", "donations", "ages", "activities"] as const;
export type Dataset = (typeof DATASETS)[number];

export const PLAIN_DATASETS = ["members", "donations", "ages"] as const;
export type PlainDataset = (typeof PLAIN_DATASETS)[number];

export function isDataset(value: string): value is Dataset {
  return (DATASETS as readonly string[]).includes(value);
}

const STATUS_LABEL: Record<string, string> = memberStatusLabels;

const SOURCE_LABEL: Record<string, string> = {
  PUBLIC: "عام",
  SELF: "من حساب",
  MEMBERSHIP: "فائض انتساب",
};

export interface ExportableMember {
  fullName: string;
  age: string | null;
  village: string;
  paymentMethod: string | null;
  paidAmount: number | null;
  supportAmount?: number;
  status: string;
  memberNumber: string | null;
  referenceCode: string | null;
  createdAt: Date;
  user: { phone: string | null } | null;
}

export interface ExportableDonation {
  donorName: string | null;
  donorPhone: string | null;
  amount: number | null;
  paymentMethod: string | null;
  status: string;
  source: string;
  createdAt: Date;
  user: { fullName: string | null } | null;
  tags: { name: string }[];
}

export function sourceOf(purpose: string, accountId: string | null): string {
  if (purpose === "MEMBERSHIP") return "MEMBERSHIP";
  return accountId ? "SELF" : "PUBLIC";
}

function day(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const MEMBER_HEADERS = [
  "الاسم الكامل",
  "رقم الهاتف",
  "القرية",
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
    m.village,
    m.age ?? "",
    m.paymentMethod ?? "",
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
    donorNameOnRecord(d),
    d.donorPhone ?? "",
    d.amount ?? 0,
    d.paymentMethod ?? "",
    STATUS_LABEL[d.status] ?? d.status,
    SOURCE_LABEL[d.source] ?? d.source,
    d.user ? nameOf(d.user) : "",
    d.tags.map((t) => t.name).join(" / "),
    day(d.createdAt),
  ]);
}

export const AGE_HEADERS = ["العصر", "عدد المنتسبين", "العدد الإجمالي", "نسبة الانتساب"];

export function ageRows(standings: AgeStanding[]): (string | number)[][] {
  return standings.map((s) => [s.name, s.members, s.total, `${s.rate}%`]);
}

export const ACTIVITY_HEADERS = [
  "النشاط",
  "دخل",
  "صرف",
  "الرصيد",
  "الحالة",
  "الصرف حسب الوسم",
  "الوصولات",
];

function balanceLabel(balance: number): string {
  if (balance > 0) return activityReport.surplus;
  if (balance < 0) return activityReport.deficit;
  return activityReport.even;
}

export function activityRows(rows: ActivityReportRow[]): (string | number)[][] {
  return rows.map((row) => [
    row.title,
    row.income,
    row.spending,
    row.balance,
    balanceLabel(row.balance),
    row.spendingByTag.map((t) => `${t.tag} ${t.amount}`).join(" / "),
    row.receiptNumbers.join(" / "),
  ]);
}

export const FILENAMES: Record<Dataset, string> = {
  members: "members",
  donations: "donations",
  ages: "age-groups",
  activities: "activities",
};
