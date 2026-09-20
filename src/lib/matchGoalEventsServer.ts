import { prisma } from "./prisma";
import { ValidationError } from "./errors";
import { tournament } from "./messages";
import {
  shootoutFromKicks,
  validateGoalEvents,
  validateKicks,
  type GoalEvent,
  type KickEvent,
} from "./matchInput";
import {
  extraTimeAllowed,
  hasExtraTime,
  kicksAllowed,
  kicksAlternate,
  playedScore,
} from "./matchScores";
import { forfeitScore } from "./forfeit";

export interface Sides {
  first: string;
  second: string;
}

export interface EventContext {
  sides: Sides;
  knockout: boolean;
  forfeitWinnerTeamId: string | null;
}

async function refuseEventsOffTheRoster(
  goals: GoalEvent[],
  kicks: KickEvent[],
  sides: Sides,
): Promise<void> {
  const userIds = [...goals, ...kicks]
    .map((event) => event.userId)
    .filter((id): id is string => id !== null);

  const seats = await prisma.teamMember.findMany({
    where: { userId: { in: userIds }, teamId: { in: [sides.first, sides.second] } },
    select: { userId: true, teamId: true },
  });
  const teamsOf = new Map<string, Set<string>>();
  for (const seat of seats) {
    if (!teamsOf.has(seat.userId)) teamsOf.set(seat.userId, new Set());
    teamsOf.get(seat.userId)!.add(seat.teamId);
  }
  const other = (teamId: string) => (teamId === sides.first ? sides.second : sides.first);

  for (const goal of goals) {
    if (goal.userId === null) continue;
    const expected = goal.kind === "OWN_GOAL" ? other(goal.teamId) : goal.teamId;
    if (!teamsOf.get(goal.userId)?.has(expected)) {
      throw new ValidationError(
        goal.kind === "OWN_GOAL" ? tournament.ownGoalScorerWrongTeam : tournament.scorerWrongTeam,
      );
    }
  }
  for (const kick of kicks) {
    if (kick.userId !== null && !teamsOf.get(kick.userId)?.has(kick.teamId)) {
      throw new ValidationError(tournament.kickerWrongTeam);
    }
  }
}

function shootout(kicks: KickEvent[], goals: GoalEvent[], ctx: EventContext) {
  if (kicks.length === 0) return { home: null, away: null };
  if (!ctx.knockout) throw new ValidationError(tournament.penaltiesKnockoutOnly);
  if (!kicksAllowed(ctx.knockout, goals, ctx.sides.first)) {
    throw new ValidationError(tournament.penaltiesTieOnly);
  }
  if (!kicksAlternate(kicks)) throw new ValidationError(tournament.kicksNotAlternating);
  const tally = shootoutFromKicks(kicks, ctx.sides.first);
  if (tally.home === tally.away) throw new ValidationError(tournament.penaltiesTied);
  return tally;
}

export async function goalEventOutcome(
  goalEvents: unknown,
  penaltyKicks: unknown,
  ctx: EventContext,
) {
  const goals = validateGoalEvents(goalEvents, ctx.sides.first, ctx.sides.second);
  if (goals === null) throw new ValidationError(tournament.goalEventsInvalid);
  const kicks = validateKicks(penaltyKicks, ctx.sides.first, ctx.sides.second);
  if (kicks === null) throw new ValidationError(tournament.kicksInvalid);

  await refuseEventsOffTheRoster(goals, kicks, ctx.sides);

  const played = playedScore(goals, ctx.sides.first);
  const score = ctx.forfeitWinnerTeamId
    ? forfeitScore(played, ctx.forfeitWinnerTeamId, ctx.sides.first)
    : played;

  if (hasExtraTime(goals)) {
    if (!ctx.knockout) throw new ValidationError(tournament.extraTimeKnockoutOnly);
    if (!extraTimeAllowed(ctx.knockout, goals, ctx.sides.first)) {
      throw new ValidationError(tournament.extraTimeTieOnly);
    }
  }
  const penalties = shootout(kicks, goals, ctx);

  return { goals, kicks, score, penalties };
}
