import { prisma } from "./prisma";
import { ValidationError } from "./errors";
import { tournament } from "./messages";
import { parseScorePair, validateGoals, type GoalInput } from "./matchInput";
import type { Sides } from "./matchGoalEventsServer";

function countedGoals(goals: unknown): GoalInput[] {
  const parsed = validateGoals(goals);
  if (parsed === null) throw new ValidationError(tournament.scorersInvalid);
  return parsed;
}

function total(goals: GoalInput[]): number {
  return goals.reduce((sum, goal) => sum + goal.count, 0);
}

async function refuseScorersOffTheirSide(
  homeGoals: GoalInput[],
  awayGoals: GoalInput[],
  sides: Sides,
): Promise<void> {
  if (homeGoals.length === 0 && awayGoals.length === 0) return;

  const seats = await prisma.teamMember.findMany({
    where: {
      userId: { in: [...homeGoals, ...awayGoals].map((goal) => goal.userId) },
      teamId: { in: [sides.first, sides.second] },
    },
    select: { userId: true, teamId: true },
  });
  const teamOf = new Map(seats.map((seat) => [seat.userId, seat.teamId]));

  for (const goal of homeGoals) {
    if (teamOf.get(goal.userId) !== sides.first) {
      throw new ValidationError(tournament.scorerNotInHome);
    }
  }
  for (const goal of awayGoals) {
    if (teamOf.get(goal.userId) !== sides.second) {
      throw new ValidationError(tournament.scorerNotInAway);
    }
  }
}

export interface ScoreEntry {
  homeScore?: unknown;
  awayScore?: unknown;
  homeGoals?: unknown;
  awayGoals?: unknown;
}

export async function scoreEntryOutcome(entry: ScoreEntry, sides: Sides) {
  const scores = parseScorePair(entry.homeScore, entry.awayScore);
  if (scores === "invalid") throw new ValidationError(tournament.resultNotNumber);
  if (scores === null) return { cleared: true as const };

  const homeGoals = countedGoals(entry.homeGoals);
  const awayGoals = countedGoals(entry.awayGoals);
  if (homeGoals.length > 0 && total(homeGoals) !== scores.home) {
    throw new ValidationError(tournament.homeGoalsMismatch);
  }
  if (awayGoals.length > 0 && total(awayGoals) !== scores.away) {
    throw new ValidationError(tournament.awayGoalsMismatch);
  }

  await refuseScorersOffTheirSide(homeGoals, awayGoals, sides);

  return { cleared: false as const, score: scores, homeGoals, awayGoals };
}
