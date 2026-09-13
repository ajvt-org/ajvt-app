import { memberStatusLabels } from "./messages";
import { formatDateTime, matchDateKey } from "./clubTime";
import { auditDiff } from "./auditDiff";
import { auditFieldLabel, auditTargetLabel, auditValueLabel } from "./auditFields";
import { auditActionLabel } from "./auditLabels";
import { donorNameOnRecord, type DonorAccount } from "./donorName";
import { seesSupporterName, type SupportViewer } from "./supportPrivacy";
import { nameOf } from "./person";
import type { AgeStanding } from "./ageStandings";
import type { ActivityReportRow } from "./activityReport";
import { activityReport } from "./texts/activityReport";
import { giftSourceLabels } from "./texts/giftSource";

export const DATASETS = ["members", "donations", "ages", "activities", "audit"] as const;
export type Dataset = (typeof DATASETS)[number];

export const PLAIN_DATASETS = ["members", "donations", "ages"] as const;
export type PlainDataset = (typeof PLAIN_DATASETS)[number];

export function isDataset(value: string): value is Dataset {
  return (DATASETS as readonly string[]).includes(value);
}

const STATUS_LABEL: Record<string, string> = memberStatusLabels;

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
  userId: string | null;
  user: DonorAccount | null;
  tags: { name: string }[];
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
    matchDateKey(m.createdAt),
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

export function donationRows(
  donations: ExportableDonation[],
  viewer: SupportViewer,
): (string | number)[][] {
  return donations.map((d) => {
    const named = seesSupporterName(viewer, d);
    return [
      donorNameOnRecord(d, viewer),
      named ? (d.donorPhone ?? "") : "",
      d.amount ?? 0,
      d.paymentMethod ?? "",
      STATUS_LABEL[d.status] ?? d.status,
      giftSourceLabels[d.source] ?? d.source,
      named && d.user ? nameOf(d.user) : "",
      d.tags.map((t) => t.name).join(" / "),
      matchDateKey(d.createdAt),
    ];
  });
}

export const AGE_HEADERS = ["العصر", "عدد المنتسبين", "العدد الإجمالي", "نسبة الانتساب"];

export function ageRows(standings: AgeStanding[]): (string | number)[][] {
  return standings.map((s) => [s.name, s.members, s.total, `${s.rate}%`]);
}

export const ACTIVITY_HEADERS = [
  "الوجهة",
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

export interface ExportableAuditEntry {
  createdAt: Date;
  adminUsername: string;
  adminRole: string | null;
  action: string;
  targetType: string | null;
  targetLabel: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
}

export const AUDIT_HEADERS = [
  "التاريخ",
  "المشرف",
  "الصلاحية",
  "الإجراء",
  "النوع",
  "السجل",
  "ما تغيّر",
  "عنوان الشبكة",
];

function changedText(before: unknown, after: unknown): string {
  return auditDiff(before, after)
    .map(
      (change) =>
        `${auditFieldLabel(change.key)} ${auditValueLabel(change.from)} ← ${auditValueLabel(change.to)}`,
    )
    .join(" / ");
}

export function auditRows(entries: ExportableAuditEntry[]): (string | number)[][] {
  return entries.map((entry) => [
    formatDateTime(entry.createdAt),
    entry.adminUsername,
    entry.adminRole ? auditValueLabel(entry.adminRole) : "",
    auditActionLabel(entry.action),
    entry.targetType ? auditTargetLabel(entry.targetType) : "",
    entry.targetLabel ?? "",
    changedText(entry.before, entry.after),
    entry.ip ?? "",
  ]);
}

export const FILENAMES: Record<Dataset, string> = {
  members: "members",
  donations: "donations",
  ages: "age-groups",
  activities: "activities",
  audit: "audit-log",
};
