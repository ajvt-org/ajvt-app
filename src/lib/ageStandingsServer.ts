import { prisma } from "./prisma";
import { rankAgeGroups, type AgeStanding } from "./ageStandings";

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
      where: { userId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  return rankAgeGroups(
    groups,
    new Map(counts.map((c) => [c.age, c._count._all])),
    new Map(accounts.map((c) => [c.age, c._count._all])),
  );
}
