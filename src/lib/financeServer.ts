import { prisma } from "@/lib/prisma";

const UNSPECIFIED_METHOD = "غير محدد";

interface DayTotal {
  date: string; // YYYY-MM-DD
  total: number;
  byMethod: Record<string, number>;
}

interface NamedEntry {
  name: string;
  amount: number;
}

interface MethodDetail {
  intisab: NamedEntry[]; // membership fees, by member name
  daem: NamedEntry[]; // named donations, by donor name
  anonymousTotal: number; // donations with no donor name ("فاعل خير")
}

function sortedEntries(map: Map<string, number>): NamedEntry[] {
  return [...map.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

// Revenue = confirmed membership fees (Member.paidAmount, status ACTIVE) +
// confirmed donations, excluding MEMBERSHIP-source rows since those already
// mirror a slice of paidAmount (see syncMembershipDonation) — summing both
// would double-count that portion.
export async function getFinanceSummary(recentDays = 30) {
  const [members, donations, expenses] = await Promise.all([
    prisma.member.findMany({
      where: { status: "ACTIVE", paidAmount: { not: null } },
      select: { fullName: true, paidAmount: true, paymentMethod: true, createdAt: true },
    }),
    prisma.donation.findMany({
      where: { status: "ACTIVE", source: { not: "MEMBERSHIP" } },
      select: { id: true, amount: true, paymentMethod: true, createdAt: true, donorName: true },
    }),
    prisma.expense.findMany({ select: { amount: true } }),
  ]);

  const byMethod: Record<string, number> = {};
  const byDay = new Map<string, DayTotal>();
  let totalRevenue = 0;

  const intisabByMethod = new Map<string, Map<string, number>>();
  const daemByMethod = new Map<string, Map<string, number>>();
  const anonymousByMethod = new Map<string, number>();

  function addRevenue(amount: number, method: string | null, date: Date) {
    const key = method || UNSPECIFIED_METHOD;
    byMethod[key] = (byMethod[key] || 0) + amount;
    totalRevenue += amount;

    const day = date.toISOString().slice(0, 10);
    const entry = byDay.get(day) || { date: day, total: 0, byMethod: {} };
    entry.total += amount;
    entry.byMethod[key] = (entry.byMethod[key] || 0) + amount;
    byDay.set(day, entry);

    return key;
  }

  function addNamed(byMethodMap: Map<string, Map<string, number>>, method: string, name: string, amount: number) {
    const perName = byMethodMap.get(method) || new Map<string, number>();
    perName.set(name, (perName.get(name) || 0) + amount);
    byMethodMap.set(method, perName);
  }

  for (const m of members) {
    const key = addRevenue(m.paidAmount ?? 0, m.paymentMethod, m.createdAt);
    addNamed(intisabByMethod, key, m.fullName, m.paidAmount ?? 0);
  }

  const unassigned: { id: string; name: string; amount: number }[] = [];

  for (const d of donations) {
    const key = addRevenue(d.amount ?? 0, d.paymentMethod, d.createdAt);
    const name = d.donorName?.trim();
    if (name) {
      addNamed(daemByMethod, key, name, d.amount ?? 0);
    } else {
      anonymousByMethod.set(key, (anonymousByMethod.get(key) || 0) + (d.amount ?? 0));
    }
    if (!d.paymentMethod) {
      unassigned.push({ id: d.id, name: name || "فاعل خير", amount: d.amount ?? 0 });
    }
  }

  const byMethodDetail: Record<string, MethodDetail> = {};
  for (const method of Object.keys(byMethod)) {
    byMethodDetail[method] = {
      intisab: sortedEntries(intisabByMethod.get(method) || new Map()),
      daem: sortedEntries(daemByMethod.get(method) || new Map()),
      anonymousTotal: anonymousByMethod.get(method) || 0,
    };
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - recentDays);
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  const days = [...byDay.values()]
    .filter((d) => d.date >= cutoffKey)
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalExpenses = expenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);

  return {
    byMethod,
    byMethodDetail,
    unassigned,
    days,
    totalRevenue,
    totalExpenses,
    net: totalRevenue - totalExpenses,
  };
}
