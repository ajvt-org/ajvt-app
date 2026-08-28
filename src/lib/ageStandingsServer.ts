import { prisma } from "./prisma";
import { rankAgeGroups, type AgeStanding } from "./ageStandings";

function tally(rows: { age: string | null; _count: { _all: number } }[]): Map<string, number> {
  return new Map(
    rows.filter((row) => row.age !== null).map((row) => [row.age as string, row._count._all]),
  );
}

export async function getAgeStandings(): Promise<AgeStanding[]> {
  const [groups, counts, accounts] = await Promise.all([
    prisma.ageGroup.findMany({
      orderBy: { createdAt: "asc" },
      select: { name: true, totalCount: true },
    }),
    prisma.member.groupBy({
      by: ["age"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
    prisma.member.groupBy({
      by: ["age"],
      _count: { _all: true },
    }),
  ]);

  return rankAgeGroups(groups, tally(counts), tally(accounts));
}
