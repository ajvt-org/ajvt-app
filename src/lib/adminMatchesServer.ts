import type { MatchShape, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { accountNamed, accountPerson } from "./person";
import { settleMvpVotes } from "./mvpVoteServer";
import { DEFAULT_MVP_VOTE_MINUTES } from "./mvpVote";
import { matchSideTeams } from "./matchSides";
import { isFootball } from "./matchShape";
import { standingOf } from "./matchSeriesServer";

interface SeriesActivity {
  matchShape: MatchShape;
  partsPerMatch: number | null;
  matchEnding: "PLAY_ALL" | "FIRST_TO" | null;
  partsToWin: number | null;
  partDecision: "OUTCOME" | "POINTS" | "SCORE" | null;
}

const TEAM_SIDE = { select: { id: true, name: true, logo: true } } as const;

export const MATCH_INCLUDE = {
  homeTeam: TEAM_SIDE,
  awayTeam: TEAM_SIDE,
  sideATeam: TEAM_SIDE,
  sideBTeam: TEAM_SIDE,
  manOfTheMatchUser: { select: { fullName: true, photo: true } },
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
      user: { select: { fullName: true, photo: true } },
    },
  },
  penaltyKicks: {
    orderBy: { order: "asc" },
    select: {
      id: true,
      teamId: true,
      order: true,
      scored: true,
      userId: true,
      user: { select: { fullName: true, photo: true } },
    },
  },
  bookings: {
    orderBy: { minute: "asc" },
    select: {
      id: true,
      cardType: true,
      minute: true,
      teamId: true,
      userId: true,
      user: { select: { fullName: true, photo: true } },
    },
  },
  parts: {
    orderBy: { order: "asc" },
    select: {
      id: true,
      order: true,
      abandoned: true,
      outcome: true,
      sideAPoints: true,
      sideBPoints: true,
      sideAColour: true,
    },
  },
  mvpVote: {
    select: {
      id: true,
      status: true,
      closesAt: true,
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

export type LoadedMatch = Prisma.MatchGetPayload<{ include: typeof MATCH_INCLUDE }>;

export function flatMatch(match: LoadedMatch, activity: SeriesActivity) {
  const sides = matchSideTeams(match, activity.matchShape);
  return {
    ...match,
    firstTeam: sides.first,
    secondTeam: sides.second,
    series: isFootball(activity.matchShape)
      ? null
      : standingOf(activity, match.parts, match.isKnockout),
    manOfTheMatch: match.manOfTheMatchUser
      ? accountPerson({ userId: match.manOfTheMatchUserId, user: match.manOfTheMatchUser })
      : null,
    goals: match.goals.map((g) => ({ ...g, member: g.userId ? accountPerson(g) : null })),
    penaltyKicks: match.penaltyKicks.map((k) => ({
      ...k,
      member: k.userId ? accountPerson(k) : null,
    })),
    bookings: match.bookings.map((b) => ({ ...b, member: accountPerson(b) })),
    mvpVote: match.mvpVote
      ? {
          ...match.mvpVote,
          candidates: match.mvpVote.candidates.map((c) => ({
            ...c,
            memberId: c.userId,
            member: accountNamed(c),
          })),
        }
      : null,
  };
}

export async function listMatches(activityId: string) {
  const read = () =>
    prisma.match.findMany({
      where: { activityId },
      orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "asc" }],
      include: MATCH_INCLUDE,
    });

  const [matches, activity] = await Promise.all([
    read(),
    prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        mvpVoteMinutes: true,
        matchShape: true,
        partsPerMatch: true,
        matchEnding: true,
        partsToWin: true,
        partDecision: true,
      },
    }),
  ]);
  const applied = await settleMvpVotes(matches);
  const series: SeriesActivity = activity ?? {
    matchShape: "FOOTBALL",
    partsPerMatch: null,
    matchEnding: null,
    partsToWin: null,
    partDecision: null,
  };

  return {
    matches: (applied.size > 0 ? await read() : matches).map((match) => flatMatch(match, series)),
    mvpVoteMinutes: activity?.mvpVoteMinutes ?? DEFAULT_MVP_VOTE_MINUTES,
  };
}
