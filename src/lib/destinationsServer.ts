import { prisma } from "./prisma";
import type { DestinationOption } from "./moneyDestination";

export async function listMoneyDestinations(
  scopedActivityIds: string[] | null,
): Promise<DestinationOption[]> {
  const [activities, competitions] = await Promise.all([
    prisma.activity.findMany({
      where: scopedActivityIds ? { id: { in: scopedActivityIds } } : {},
      orderBy: { order: "asc" },
      select: { id: true, title: true },
    }),
    scopedActivityIds
      ? Promise.resolve([])
      : prisma.competition.findMany({
          orderBy: { startsAt: "desc" },
          select: { id: true, name: true },
        }),
  ]);

  return [
    ...activities.map((activity) => ({
      id: activity.id,
      title: activity.title,
      kind: "activity" as const,
    })),
    ...competitions.map((competition) => ({
      id: competition.id,
      title: competition.name,
      kind: "competition" as const,
    })),
  ];
}
