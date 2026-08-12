import { prisma } from "@/lib/prisma";

const UNSPECIFIED_METHOD = "غير محدد";

interface DayTotal {
  date: string; // YYYY-MM-DD
  total: number;
  byMethod: Record<string, number>;
}

// Revenue = confirmed membership fees (Member.paidAmount, status ACTIVE) +
// confirmed donations, excluding MEMBERSHIP-source rows since those already
// mirror a slice of paidAmount (see syncMembershipDonation) — summing both
// would double-count that portion.
export async function getFinanceSummary(recentDays = 30) {
  const [members, donations, expenses] = await Promise.all([
    prisma.member.findMany({
      where: { status: "ACTIVE", paidAmount: { not: null } },
      select: { paidAmount: true, paymentMethod: true, createdAt: true },
    }),
    prisma.donation.findMany({
      where: { status: "ACTIVE", source: { not: "MEMBERSHIP" } },
      select: { amount: true, paymentMethod: true, createdAt: true },
    }),
    prisma.expense.findMany({ select: { amount: true } }),
  ]);

  const byMethod: Record<string, number> = {};
  const byDay = new Map<string, DayTotal>();
  let totalRevenue = 0;

  function addRevenue(amount: number, method: string | null, date: Date) {
    const key = method || UNSPECIFIED_METHOD;
    byMethod[key] = (byMethod[key] || 0) + amount;
    totalRevenue += amount;

    const day = date.toISOString().slice(0, 10);
    const entry = byDay.get(day) || { date: day, total: 0, byMethod: {} };
    entry.total += amount;
    entry.byMethod[key] = (entry.byMethod[key] || 0) + amount;
    byDay.set(day, entry);
  }

  for (const m of members) addRevenue(m.paidAmount ?? 0, m.paymentMethod, m.createdAt);
  for (const d of donations) addRevenue(d.amount ?? 0, d.paymentMethod, d.createdAt);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - recentDays);
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  const days = [...byDay.values()]
    .filter((d) => d.date >= cutoffKey)
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalExpenses = expenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);

  return {
    byMethod,
    days,
    totalRevenue,
    totalExpenses,
    net: totalRevenue - totalExpenses,
  };
}
