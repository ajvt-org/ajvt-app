import { prisma } from "./prisma";
import { getAppSettings } from "./settingsServer";
import { membershipStanding, needsHandling, netMoney } from "./adminHome";
import { currentMemberships } from "./currentMembershipServer";
import { asMembershipState } from "./currentMembership";
import { matchDateKey } from "./clubTime";
import { matchSideTeams } from "./matchSides";

const DAY_MS = 86_400_000;

const HOME_SIDE = { select: { name: true } } as const;

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
      activity: { select: { id: true, title: true, matchShape: true } },
      homeTeam: HOME_SIDE,
      awayTeam: HOME_SIDE,
      sideATeam: HOME_SIDE,
      sideBTeam: HOME_SIDE,
    },
  });
  const today = matchDateKey(now);
  return rows
    .filter((m) => m.matchDate && matchDateKey(m.matchDate) === today)
    .map((m) => {
      const sides = matchSideTeams(m, m.activity.matchShape);
      return { ...m, firstTeam: sides.first, secondTeam: sides.second };
    });
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
