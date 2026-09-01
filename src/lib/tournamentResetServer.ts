import { prisma } from "./prisma";
import { ValidationError } from "./errors";
import { activities as messages } from "./messages";

export interface TournamentResetCounts {
  matches: number;
  results: number;
  groups: number;
  days: number;
  suspensions: number;
}

const OPEN = ["PROPOSED", "ACTIVE"] as const;

export async function tournamentResetCounts(activityId: string): Promise<TournamentResetCounts> {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { isTournament: true },
  });
  if (!activity?.isTournament) throw new ValidationError(messages.notATournament);

  const [matches, results, groups, days, suspensions] = await Promise.all([
    prisma.match.count({ where: { activityId } }),
    prisma.match.count({ where: { activityId, status: "PLAYED" } }),
    prisma.group.count({ where: { activityId } }),
    prisma.tournamentDay.count({ where: { activityId } }),
    prisma.suspension.count({ where: { activityId, status: { in: [...OPEN] } } }),
  ]);

  return { matches, results, groups, days, suspensions };
}

export async function resetTournament(activityId: string): Promise<TournamentResetCounts> {
  const counts = await tournamentResetCounts(activityId);

  await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { activityId } });
    await tx.team.updateMany({ where: { activityId }, data: { groupId: null } });
    await tx.group.deleteMany({ where: { activityId } });
    await tx.tournamentDay.deleteMany({ where: { activityId } });
    await tx.suspension.deleteMany({ where: { activityId, status: { in: [...OPEN] } } });
    await tx.activity.update({ where: { id: activityId }, data: { endsAt: null } });
  });

  return counts;
}
