import { prisma } from "./prisma";
import { getAppSettings } from "./settingsServer";
import { membershipStanding, needsHandling, netMoney } from "./adminHome";
import { currentMemberships } from "./currentMembershipServer";
import { asMembershipState } from "./currentMembership";
import { matchDateKey } from "./clubTime";

const DAY_MS = 86_400_000;

export async function matchesToday(now = new Date()) {
  const rows = await prisma.match.findMany({
    where: {
      matchDate: { gte: new Date(now.getTime() - DAY_MS), lt: new Date(now.getTime() + DAY_MS) },
    },
    orderBy: { matchDate: "asc" },
    select: {
      id: true,
      matchDate: true,
      status: true,
      homeScore: true,
      awayScore: true,
      activity: { select: { id: true, title: true } },
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  });
  const today = matchDateKey(now);
  return rows.filter((m) => m.matchDate && matchDateKey(m.matchDate) === today);
}

export async function adminHomeSummary() {
  const settings = await getAppSettings();

  const [memberships, payments, expenses, pendingRegistrations, pendingPayments, today] =
    await Promise.all([
      currentMemberships(prisma),
      prisma.payment.aggregate({ where: { status: "ACTIVE" }, _sum: { amount: true } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.activityRegistration.count({ where: { status: "PENDING" } }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      matchesToday(),
    ]);

  const members = memberships.map((m) => asMembershipState(m));
  const pendingMembers = memberships.filter((m) => m.status === "PENDING").length;

  const revenue = payments._sum.amount ?? 0;
  const spending = expenses._sum.amount ?? 0;
  const counts = { pendingMembers, pendingRegistrations, pendingPayments };

  return {
    year: settings.membershipYear,
    membership: membershipStanding(members, settings.membershipYear),
    money: { revenue, spending, net: netMoney(revenue, spending) },
    handling: { ...counts, total: needsHandling(counts) },
    matchesToday: today,
  };
}
