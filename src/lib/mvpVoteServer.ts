import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { entrantWording, tournament } from "./messages";
import { entrantOf } from "./entrantServer";
import { isFootball } from "./matchShape";
import { closesAtFrom, isVoteClosed, mvpWinner } from "./mvpVote";

export type SettleableMatch = {
  id: string;
  manOfTheMatchUserId: string | null;
  mvpVote: {
    status: "OPEN" | "CLOSED";
    closesAt: Date;
    candidates: { userId: string; _count: { votes: number } }[];
  } | null;
};

function winnerFor(match: SettleableMatch, now: Date): string | null {
  if (!match.mvpVote || match.manOfTheMatchUserId) return null;
  if (!isVoteClosed(match.mvpVote, now)) return null;
  return mvpWinner(
    match.mvpVote.candidates.map((c) => ({ memberId: c.userId, votes: c._count.votes })),
  );
}

export async function settleMvpVotes(
  matches: SettleableMatch[],
  now = new Date(),
): Promise<Map<string, string>> {
  const applied = new Map<string, string>();
  for (const match of matches) {
    const winner = winnerFor(match, now);
    if (winner) applied.set(match.id, winner);
  }
  if (applied.size === 0) return applied;

  await prisma.$transaction(
    [...applied].map(([matchId, userId]) =>
      prisma.match.updateMany({
        where: { id: matchId, manOfTheMatchUserId: null },
        data: { manOfTheMatchUserId: userId },
      }),
    ),
  );
  return applied;
}

const VOTE_INCLUDE = {
  candidates: {
    select: {
      id: true,
      userId: true,
      user: { select: { fullName: true } },
      _count: { select: { votes: true } },
    },
  },
} as const;

export async function openMvpVote(matchId: string, candidateUserIds: string[], minutes?: number) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      mvpVote: { select: { id: true } },
      activity: {
        select: { mvpVoteMinutes: true, matchShape: true, minTeamSize: true, maxTeamSize: true },
      },
    },
  });
  if (!match) throw new NotFoundError(tournament.matchNotFound);
  if (!isFootball(match.activity.matchShape)) {
    throw new ValidationError(tournament.motmFootballOnly);
  }
  if (match.homeTeam === null || match.awayTeam === null) {
    throw new ValidationError(entrantWording(entrantOf(match.activity)).fixtureHasNoEntrants);
  }
  if (match.status !== "PLAYED") throw new ValidationError(tournament.voteNeedsResult);
  if (match.mvpVote) throw new ConflictError(tournament.mvpVoteExists);

  const candidates = await prisma.user.findMany({
    where: { id: { in: candidateUserIds } },
    select: { id: true },
  });
  const seats = await prisma.teamMember.findMany({
    where: {
      userId: { in: candidates.map((candidate) => candidate.id) },
      teamId: { in: [match.homeTeam.id, match.awayTeam.id] },
    },
    select: { userId: true },
  });
  if (seats.length !== candidateUserIds.length) {
    throw new ValidationError(tournament.mvpCandidateOutsideMatch);
  }

  const vote = await prisma.matchMvpVote.create({
    data: {
      matchId,
      closesAt: closesAtFrom(new Date(), minutes ?? match.activity.mvpVoteMinutes),
      candidates: { create: candidates.map((candidate) => ({ userId: candidate.id })) },
    },
    include: VOTE_INCLUDE,
  });

  return { vote, home: match.homeTeam, away: match.awayTeam, activityId: match.activityId };
}

export async function changeMvpVote(
  matchId: string,
  change: { status?: "OPEN" | "CLOSED"; minutes?: number },
) {
  const existing = await prisma.matchMvpVote.findUnique({
    where: { matchId },
    select: { id: true, match: { select: { activity: { select: { mvpVoteMinutes: true } } } } },
  });
  if (!existing) throw new NotFoundError(tournament.noVoteForMatch);

  const now = new Date();
  const reopening = change.status === "OPEN";
  const window =
    change.minutes !== undefined
      ? change.minutes
      : reopening
        ? existing.match.activity.mvpVoteMinutes
        : null;

  return prisma.matchMvpVote.update({
    where: { matchId },
    data: {
      ...(change.status
        ? { status: change.status, closedAt: change.status === "CLOSED" ? now : null }
        : {}),
      ...(window !== null ? { closesAt: closesAtFrom(now, window) } : {}),
    },
    include: VOTE_INCLUDE,
  });
}

export async function deleteMvpVote(matchId: string) {
  const existing = await prisma.matchMvpVote.findUnique({ where: { matchId } });
  if (!existing) throw new NotFoundError(tournament.noVoteForMatch);

  await prisma.matchMvpVote.delete({ where: { matchId } });
}
