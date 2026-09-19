import type { MatchStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { NotFoundError } from "./errors";
import { entrantWording, tournament } from "./messages";
import { entrantOfMatch } from "./entrantServer";
import { matchSideTeams } from "./matchSides";
import { serveMatch } from "./suspensionServer";
import type { GoalEvent, GoalInput, KickEvent } from "./matchInput";
import type { Sides } from "./matchGoalEventsServer";

const PERSON = { select: { fullName: true, photo: true } } as const;
const SIDE = { select: { id: true, name: true, logo: true } } as const;

export const MATCH_ADMIN_INCLUDE = {
  homeTeam: SIDE,
  awayTeam: SIDE,
  sideATeam: SIDE,
  sideBTeam: SIDE,
  manOfTheMatchUser: PERSON,
  goals: {
    orderBy: { minute: "asc" },
    select: {
      id: true,
      count: true,
      minute: true,
      teamId: true,
      kind: true,
      period: true,
      userId: true,
      user: PERSON,
    },
  },
  penaltyKicks: {
    orderBy: { order: "asc" },
    select: { id: true, teamId: true, order: true, scored: true, userId: true, user: PERSON },
  },
  bookings: {
    orderBy: { minute: "asc" },
    select: { id: true, cardType: true, minute: true, teamId: true, userId: true, user: PERSON },
  },
  mvpVote: {
    select: {
      id: true,
      status: true,
      candidates: {
        select: {
          id: true,
          userId: true,
          user: { select: { fullName: true } },
          _count: { select: { votes: true } },
        },
      },
    },
  },
} as const;

export interface MatchData {
  matchDate?: Date | null;
  dayId?: string | null;
  round?: string | null;
  venue?: string | null;
  order?: number;
  isKnockout?: boolean;
  homeScore?: number | null;
  awayScore?: number | null;
  homePenalties?: number | null;
  awayPenalties?: number | null;
  manOfTheMatchUserId?: string | null;
  forfeitWinnerTeamId?: string | null;
  status?: MatchStatus;
  suspensionsServedAt?: Date;
  homeTeamId?: string;
  awayTeamId?: string;
  sideATeamId?: string;
  sideBTeamId?: string;
}

export interface MatchWrite {
  matchId: string;
  data: MatchData;
  sides: Sides;
  events: { goals: GoalEvent[]; kicks: KickEvent[] } | null;
  entry: { cleared: boolean; homeGoals: GoalInput[]; awayGoals: GoalInput[] } | null;
  serveSuspensionsFor: string | null;
}

export function scheduleMatch(matchId: string, data: MatchData) {
  return prisma.match.update({
    where: { id: matchId },
    data,
    include: MATCH_ADMIN_INCLUDE,
  });
}

export function writeMatchUpdate(write: MatchWrite) {
  const { matchId, data, sides, events, entry } = write;

  return prisma.$transaction(async (tx) => {
    if (events) {
      await tx.matchGoal.deleteMany({ where: { matchId } });
      if (events.goals.length > 0) {
        await tx.matchGoal.createMany({
          data: events.goals.map((goal) => ({
            matchId,
            userId: goal.userId,
            teamId: goal.teamId,
            kind: goal.kind,
            period: goal.period,
            minute: goal.minute,
          })),
        });
      }
      await tx.matchPenaltyKick.deleteMany({ where: { matchId } });
      if (events.kicks.length > 0) {
        await tx.matchPenaltyKick.createMany({
          data: events.kicks.map((kick, index) => ({
            matchId,
            teamId: kick.teamId,
            userId: kick.userId,
            order: index + 1,
            scored: kick.scored,
          })),
        });
      }
    }
    if (entry) {
      await tx.matchGoal.deleteMany({ where: { matchId } });
      if (entry.cleared) await tx.matchPenaltyKick.deleteMany({ where: { matchId } });
      for (const [goals, teamId] of [
        [entry.homeGoals, sides.first],
        [entry.awayGoals, sides.second],
      ] as const) {
        if (goals.length === 0) continue;
        await tx.matchGoal.createMany({
          data: goals.map((goal) => ({
            matchId,
            userId: goal.userId,
            teamId,
            count: goal.count,
            minute: goal.minute,
          })),
        });
      }
    }
    if (write.serveSuspensionsFor) {
      await serveMatch(tx, write.serveSuspensionsFor, [sides.first, sides.second]);
      data.suspensionsServedAt = new Date();
    }
    return tx.match.update({ where: { id: matchId }, data, include: MATCH_ADMIN_INCLUDE });
  });
}

export async function removeMatch(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
      sideATeam: { select: { name: true } },
      sideBTeam: { select: { name: true } },
      activity: { select: { matchShape: true } },
    },
  });
  if (!match) throw new NotFoundError(tournament.matchNotFound);

  const words = entrantWording(await entrantOfMatch(prisma, matchId));
  const played = matchSideTeams(match, match.activity.matchShape);
  const homeName = played.first?.name ?? words.entrantNotSetYet;
  const awayName = played.second?.name ?? words.entrantNotSetYet;

  await prisma.match.delete({ where: { id: matchId } });

  return { match, homeName, awayName };
}
