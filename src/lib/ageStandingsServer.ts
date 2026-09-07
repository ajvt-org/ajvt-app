import { prisma } from "./prisma";
import { rankAgeGroups, type AgeStanding } from "./ageStandings";
import { asMembershipState, latestByAccount } from "./currentMembership";
import { holdsMembership, membershipState } from "./membershipState";
import { getAppSettings } from "./settingsServer";

function tally(rows: { user: { age: string | null } }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.user.age) continue;
    counts.set(row.user.age, (counts.get(row.user.age) ?? 0) + 1);
  }
  return counts;
}

export async function getAgeStandings({ everyGroup = false } = {}): Promise<AgeStanding[]> {
  const [groups, rows, { membershipYear }] = await Promise.all([
    prisma.ageGroup.findMany({
      where: everyGroup ? undefined : { approved: true },
      orderBy: { createdAt: "asc" },
      select: { name: true, totalCount: true },
    }),
    prisma.membership.findMany({
      select: {
        userId: true,
        year: true,
        status: true,
        endedAt: true,
        user: { select: { age: true } },
      },
    }),
    getAppSettings(),
  ]);

  const accounts = [...latestByAccount(rows).values()];
  const active = accounts.filter((row) =>
    holdsMembership(membershipState(asMembershipState(row), membershipYear)),
  );

  return rankAgeGroups(groups, tally(active), tally(accounts), { keepEmpty: everyGroup });
}
