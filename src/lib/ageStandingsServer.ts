import { prisma } from "./prisma";
import { rankAgeGroups, type AgeStanding } from "./ageStandings";
import { latestByAccount } from "./currentMembership";

function tally(rows: { user: { age: string | null } }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.user.age) continue;
    counts.set(row.user.age, (counts.get(row.user.age) ?? 0) + 1);
  }
  return counts;
}

export async function getAgeStandings(): Promise<AgeStanding[]> {
  const [groups, rows] = await Promise.all([
    prisma.ageGroup.findMany({
      orderBy: { createdAt: "asc" },
      select: { name: true, totalCount: true },
    }),
    prisma.membership.findMany({
      select: { userId: true, year: true, status: true, user: { select: { age: true } } },
    }),
  ]);

  const accounts = [...latestByAccount(rows).values()];
  const active = accounts.filter((row) => row.status === "ACTIVE");

  return rankAgeGroups(groups, tally(active), tally(accounts));
}
