import { prisma } from "./prisma";
import { rankAgeGroups, type AgeStanding } from "./ageStandings";

function tally(rows: { user: { age: string | null } }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.user.age) continue;
    counts.set(row.user.age, (counts.get(row.user.age) ?? 0) + 1);
  }
  return counts;
}

export async function getAgeStandings(): Promise<AgeStanding[]> {
  const [groups, counts, accounts] = await Promise.all([
    prisma.ageGroup.findMany({
      orderBy: { createdAt: "asc" },
      select: { name: true, totalCount: true },
    }),
    prisma.member.findMany({
      where: { status: "ACTIVE" },
      select: { user: { select: { age: true } } },
    }),
    prisma.member.findMany({ select: { user: { select: { age: true } } } }),
  ]);

  return rankAgeGroups(groups, tally(counts), tally(accounts));
}
