import { prisma } from "./prisma";
import { ConflictError, ValidationError } from "./errors";
import { tournament, type EntrantWording } from "./messages";
import {
  parseScorePair,
  scoreFromGoals,
  type GoalEvent,
  type GoalInput,
  type KickEvent,
} from "./matchInput";
import { FORFEIT_EXTRA_MAX, forfeitScore } from "./forfeit";
import { isFootball } from "./matchShape";
import type { MatchData } from "./matchAdminWriteServer";
import { suspendedUserIds } from "./suspensionServer";
import type { EditableMatch } from "./matchUpdateServer";
import type { Sides } from "./matchGoalEventsServer";

export function applyPenalties(
  data: MatchData,
  match: EditableMatch,
  homePenalties: unknown,
  awayPenalties: unknown,
): void {
  const penalties = parseScorePair(homePenalties, awayPenalties);
  if (penalties === "invalid") throw new ValidationError(tournament.penaltiesNotNumber);
  if (penalties === null) {
    data.homePenalties = null;
    data.awayPenalties = null;
    return;
  }
  if (penalties.home === penalties.away) throw new ValidationError(tournament.penaltiesTied);

  const knockout = data.isKnockout ?? match.isKnockout;
  if (!knockout) throw new ValidationError(tournament.penaltiesKnockoutOnly);

  const home = data.homeScore !== undefined ? data.homeScore : match.homeScore;
  const away = data.awayScore !== undefined ? data.awayScore : match.awayScore;
  if (home === null || away === null || home !== away) {
    throw new ValidationError(tournament.penaltiesTieOnly);
  }

  data.homePenalties = penalties.home;
  data.awayPenalties = penalties.away;
}

export async function applyForfeit(
  data: MatchData,
  match: EditableMatch,
  winnerTeamId: string | null,
  sides: Sides,
  words: EntrantWording,
  eventsMode: boolean,
): Promise<void> {
  if (winnerTeamId !== null && winnerTeamId !== sides.first && winnerTeamId !== sides.second) {
    throw new ValidationError(words.forfeitWinnerNotInMatch);
  }
  data.forfeitWinnerTeamId = winnerTeamId;
  if (winnerTeamId === null) data.forfeitExtraGoals = 0;

  if (eventsMode || match.status !== "PLAYED") return;

  const stored = await prisma.matchGoal.findMany({
    where: { matchId: match.id },
    select: { teamId: true },
  });
  const scored = scoreFromGoals(stored, sides.first);
  const score = winnerTeamId ? forfeitScore(scored, winnerTeamId, sides.first) : scored;
  data.homeScore = score.home;
  data.awayScore = score.away;
}

export function applyForfeitAward(
  data: MatchData,
  match: EditableMatch,
  extraGoals: unknown,
): void {
  const winner =
    data.forfeitWinnerTeamId !== undefined ? data.forfeitWinnerTeamId : match.forfeitWinnerTeamId;
  if (winner === null) {
    data.forfeitExtraGoals = 0;
    return;
  }
  const extra = Number(extraGoals === "" || extraGoals === null ? 0 : extraGoals);
  if (!Number.isInteger(extra) || extra < 0 || extra > FORFEIT_EXTRA_MAX) {
    throw new ValidationError(tournament.forfeitExtraGoalsInvalid);
  }
  data.forfeitExtraGoals = extra;
}

export async function applyManOfTheMatch(
  data: MatchData,
  match: EditableMatch,
  userId: string | null,
  sides: Sides,
): Promise<void> {
  if (userId === null) {
    data.manOfTheMatchUserId = null;
    return;
  }
  if (!isFootball(match.activity.matchShape)) {
    throw new ValidationError(tournament.motmFootballOnly);
  }
  const seat = await prisma.teamMember.findFirst({
    where: { userId, teamId: { in: [sides.first, sides.second] } },
  });
  if (!seat) throw new ValidationError(tournament.motmNotInMatch);
  data.manOfTheMatchUserId = userId;
}

export async function refuseSuspendedPlayers(
  activityId: string,
  data: MatchData,
  events: { goals: GoalEvent[]; kicks: KickEvent[] } | null,
  entry: { homeGoals: GoalInput[]; awayGoals: GoalInput[] } | null,
): Promise<void> {
  const involved = [
    ...(entry ? [...entry.homeGoals, ...entry.awayGoals].map((goal) => goal.userId) : []),
    ...(events
      ? [...events.goals, ...events.kicks]
          .map((event) => event.userId)
          .filter((id): id is string => id !== null)
      : []),
    ...(data.manOfTheMatchUserId ? [data.manOfTheMatchUserId] : []),
  ];

  const suspended = await suspendedUserIds(activityId);
  if (involved.some((userId) => suspended.has(userId))) {
    throw new ConflictError(tournament.memberSuspended);
  }
}
