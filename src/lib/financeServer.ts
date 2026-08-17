import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { money } from "@/lib/messages";

const UNSPECIFIED_METHOD = "غير محدد";

interface DayRecord {
  date: string; // YYYY-MM-DD
  time: string; // full ISO timestamp, for sorting/export
  name: string;
  amount: number;
  method: string;
  kind: "انتساب" | "دعم";
}

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
  anonymousTotal: number; // donations with no donor name (money.anonymousDonor)
}

function sortedEntries(map: Map<string, number>): NamedEntry[] {
  return [...map.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

// Revenue = membership fees (capped at MEMBERSHIP_FEE per member — "انتساب")
// + all confirmed donations ("دعم"), including MEMBERSHIP-source rows: those
// mirror a member's surplus over the fee (see syncMembershipDonation) and are
// exactly the amount that should count as دعم rather than انتساب, matching
// the public leaderboard's own attribution.
export async function getFinanceSummary(recentDays = 30, activityId?: string) {
  const scoped = activityId !== undefined;
  const [members, donations, expenses] = await Promise.all([
    scoped
      ? Promise.resolve([])
      : prisma.member.findMany({
          where: { status: "ACTIVE", paidAmount: { not: null } },
          select: { fullName: true, paidAmount: true, paymentMethod: true, createdAt: true },
        }),
    prisma.donation.findMany({
      where: { status: "ACTIVE", ...(scoped ? { activityId } : {}) },
      select: { id: true, amount: true, paymentMethod: true, createdAt: true, donorName: true },
    }),
    prisma.expense.findMany({
      where: scoped ? { activityId } : {},
      select: { amount: true },
    }),
  ]);

  const byMethod: Record<string, number> = {};
  const byDay = new Map<string, DayTotal>();
  const allRecords: DayRecord[] = [];
  let totalRevenue = 0;

  const intisabByMethod = new Map<string, Map<string, number>>();
  const daemByMethod = new Map<string, Map<string, number>>();
  const anonymousByMethod = new Map<string, number>();

  function addRevenue(
    amount: number,
    method: string | null,
    date: Date,
    name: string,
    kind: "انتساب" | "دعم",
  ) {
    const key = method || UNSPECIFIED_METHOD;
    byMethod[key] = (byMethod[key] || 0) + amount;
    totalRevenue += amount;

    const day = date.toISOString().slice(0, 10);
    const entry = byDay.get(day) || { date: day, total: 0, byMethod: {} };
    entry.total += amount;
    entry.byMethod[key] = (entry.byMethod[key] || 0) + amount;
    byDay.set(day, entry);
    allRecords.push({ date: day, time: date.toISOString(), name, amount, method: key, kind });

    return key;
  }

  function addNamed(
    byMethodMap: Map<string, Map<string, number>>,
    method: string,
    name: string,
    amount: number,
  ) {
    const perName = byMethodMap.get(method) || new Map<string, number>();
    perName.set(name, (perName.get(name) || 0) + amount);
    byMethodMap.set(method, perName);
  }

  for (const m of members) {
    const fee = Math.min(m.paidAmount ?? 0, MEMBERSHIP_FEE);
    const key = addRevenue(fee, m.paymentMethod, m.createdAt, m.fullName, "انتساب");
    addNamed(intisabByMethod, key, m.fullName, fee);
  }

  const unassigned: { id: string; name: string; amount: number }[] = [];

  for (const d of donations) {
    const name = d.donorName?.trim();
    const key = addRevenue(
      d.amount ?? 0,
      d.paymentMethod,
      d.createdAt,
      name || money.anonymousDonor,
      "دعم",
    );
    if (name) {
      addNamed(daemByMethod, key, name, d.amount ?? 0);
    } else {
      anonymousByMethod.set(key, (anonymousByMethod.get(key) || 0) + (d.amount ?? 0));
    }
    if (!d.paymentMethod) {
      unassigned.push({ id: d.id, name: name || money.anonymousDonor, amount: d.amount ?? 0 });
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
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((d) => ({
      ...d,
      records: allRecords
        .filter((r) => r.date === d.date)
        .sort((a, b) => b.time.localeCompare(a.time)),
    }));

  const totalExpenses = expenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);

  return {
    byMethod,
    byMethodDetail,
    unassigned,
    days,
    // Full, un-windowed record list (unlike `days`, not limited to recentDays)
    // — used for CSV export so it covers the whole history, not just the UI window.
    allRecords: [...allRecords].sort((a, b) => b.time.localeCompare(a.time)),
    totalRevenue,
    totalExpenses,
    net: totalRevenue - totalExpenses,
  };
}
