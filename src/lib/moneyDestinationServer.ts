import { prisma } from "./prisma";
import { ValidationError } from "./errors";
import { activities, common, quiz } from "./messages";
import { hasTwoDestinations, type MoneyDestination } from "./moneyDestination";

export interface ResolvedDestination {
  activityId: string | null;
  competitionId: string | null;
}

export async function resolveMoneyDestination(
  destination: MoneyDestination,
): Promise<ResolvedDestination> {
  if (hasTwoDestinations(destination)) throw new ValidationError(common.oneDestinationOnly);

  const { activityId, competitionId } = destination;
  if (activityId) {
    const found = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true },
    });
    if (!found) throw new ValidationError(activities.notFound);
    return { activityId: found.id, competitionId: null };
  }
  if (competitionId) {
    const found = await prisma.competition.findUnique({
      where: { id: competitionId },
      select: { id: true },
    });
    if (!found) throw new ValidationError(quiz.competitionNotFound);
    return { activityId: null, competitionId: found.id };
  }
  return { activityId: null, competitionId: null };
}
