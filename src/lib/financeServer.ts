import { prisma } from "@/lib/prisma";
import { money } from "@/lib/messages";
import { splitPayment } from "@/lib/membershipPayment";

const UNSPECIFIED_METHOD = "غير محدد";

interface DayRecord {
  date: string;
  time: string;
  name: string;
  amount: number;
  method: string;
  kind: "انتساب" | "دعم";
}

interface DayTotal {
  date: string;
  total: number;
  byMethod: Record<string, number>;
}

interface NamedEntry {
  name: string;
  amount: number;
}

interface MethodDetail {
  intisab: NamedEntry[];
  daem: NamedEntry[];
  anonymousTotal: number;
}

interface DetailRow {
  method: string | null;
  kind: "intisab" | "daem" | "anon";
  name: string | null;
  amount: number;
}

const byAmountDesc = (a: NamedEntry, b: NamedEntry) => b.amount - a.amount;

export async function getFinanceSummary(recentDays = 30, activityId?: string) {
  const scope = activityId !== undefined ? { activityId } : {};
  const activity = activityId ?? null;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - recentDays);
  const windowStart = new Date(`${cutoff.toISOString().slice(0, 10)}T00:00:00.000Z`);

  const [payments, methodTotals, expenseTotal, unassignedRows, detailRows] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "ACTIVE", ...scope, createdAt: { gte: windowStart } },
      select: {
        purpose: true,
        amount: true,
        feeApplied: true,
        method: true,
        createdAt: true,
        donorName: true,
        member: { select: { user: { select: { fullName: true } } } },
      },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { status: "ACTIVE", ...scope },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({ where: scope, _sum: { amount: true } }),
    prisma.payment.findMany({
      where: { status: "ACTIVE", ...scope, method: null, purpose: { not: "MEMBERSHIP" } },
      select: { id: true, amount: true, donorName: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.$queryRaw<DetailRow[]>`
      WITH parts AS (
        SELECT p."method" AS method,
               CASE WHEN p."purpose" = 'MEMBERSHIP'
                    THEN LEAST(p."amount", COALESCE(p."feeApplied", 0)) ELSE 0 END AS fee,
               CASE WHEN p."purpose" = 'MEMBERSHIP'
                    THEN p."amount" - LEAST(p."amount", COALESCE(p."feeApplied", 0))
                    ELSE p."amount" END AS support,
               u."fullName" AS "memberName",
               NULLIF(BTRIM(p."donorName"), '') AS "donorName"
        FROM "Payment" p
        LEFT JOIN "Member" m ON m.id = p."memberId"
        LEFT JOIN "User" u ON u.id = m."userId"
        WHERE p."status" = 'ACTIVE'
          AND (${activity}::text IS NULL OR p."activityId" = ${activity}::text)
      )
      SELECT method, 'intisab' AS kind, "memberName" AS name, SUM(fee)::int AS amount
      FROM parts WHERE fee > 0 GROUP BY method, "memberName"
      UNION ALL
      SELECT method, 'daem' AS kind, "donorName" AS name, SUM(support)::int AS amount
      FROM parts WHERE support > 0 AND "donorName" IS NOT NULL GROUP BY method, "donorName"
      UNION ALL
      SELECT method, 'anon' AS kind, NULL AS name, SUM(support)::int AS amount
      FROM parts WHERE support > 0 AND "donorName" IS NULL GROUP BY method
    `,
  ]);

  const byMethod: Record<string, number> = {};
  let totalRevenue = 0;
  for (const row of methodTotals) {
    const key = row.method || UNSPECIFIED_METHOD;
    const amount = row._sum.amount ?? 0;
    byMethod[key] = (byMethod[key] || 0) + amount;
    totalRevenue += amount;
  }

  const byMethodDetail: Record<string, MethodDetail> = {};
  for (const method of Object.keys(byMethod)) {
    byMethodDetail[method] = { intisab: [], daem: [], anonymousTotal: 0 };
  }
  for (const row of detailRows) {
    const detail = byMethodDetail[row.method || UNSPECIFIED_METHOD];
    if (!detail) continue;
    if (row.kind === "anon") detail.anonymousTotal += row.amount;
    else detail[row.kind].push({ name: row.name ?? "", amount: row.amount });
  }
  for (const detail of Object.values(byMethodDetail)) {
    detail.intisab.sort(byAmountDesc);
    detail.daem.sort(byAmountDesc);
  }

  const byDay = new Map<string, DayTotal>();
  const allRecords: DayRecord[] = [];

  function addRecord(
    amount: number,
    method: string | null,
    date: Date,
    name: string,
    kind: "انتساب" | "دعم",
  ) {
    const key = method || UNSPECIFIED_METHOD;
    const day = date.toISOString().slice(0, 10);
    const entry = byDay.get(day) || { date: day, total: 0, byMethod: {} };
    entry.total += amount;
    entry.byMethod[key] = (entry.byMethod[key] || 0) + amount;
    byDay.set(day, entry);
    allRecords.push({ date: day, time: date.toISOString(), name, amount, method: key, kind });
  }

  for (const p of payments) {
    if (p.purpose !== "MEMBERSHIP") {
      addRecord(
        p.amount,
        p.method,
        p.createdAt,
        p.donorName?.trim() || money.anonymousDonor,
        "دعم",
      );
      continue;
    }
    const { fee, surplus } = splitPayment(p.amount, p.feeApplied ?? 0);
    addRecord(fee, p.method, p.createdAt, p.member?.user.fullName ?? "", "انتساب");
    if (surplus > 0) {
      addRecord(surplus, p.method, p.createdAt, p.donorName?.trim() || money.anonymousDonor, "دعم");
    }
  }

  const days = [...byDay.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((d) => ({
      ...d,
      records: allRecords
        .filter((r) => r.date === d.date)
        .sort((a, b) => b.time.localeCompare(a.time)),
    }));

  const unassigned = unassignedRows.map((p) => ({
    id: p.id,
    name: p.donorName?.trim() || money.anonymousDonor,
    amount: p.amount,
  }));

  const totalExpenses = expenseTotal._sum.amount ?? 0;

  return {
    byMethod,
    byMethodDetail,
    unassigned,
    days,
    allRecords: [...allRecords].sort((a, b) => b.time.localeCompare(a.time)),
    totalRevenue,
    totalExpenses,
    net: totalRevenue - totalExpenses,
  };
}
