import { prisma } from "./prisma";
import { getCompetition, shapeOf } from "./competitionServer";
import { currentRound, groupOf, endsAt } from "./quizRound";
import {
  roundRanking,
  groupRanking,
  finalRanking,
  standingOf,
  type RoundScore,
  type Ranked,
} from "./quizRanking";

export interface Board {
  rank: number;
  userId: string;
  name: string;
  photoUrl: string | null;
  total: number;
}

async function roundScores(competitionId: string): Promise<RoundScore[]> {
  const attempts = await prisma.quizAttempt.findMany({
    where: { round: { competitionId } },
    select: { userId: true, score: true, finishedAt: true, round: { select: { index: true } } },
  });
  return attempts.map((a) => ({
    userId: a.userId,
    index: a.round.index,
    score: a.score,
    finishedAt: a.finishedAt,
  }));
}

async function named(rows: Ranked[], limit?: number): Promise<Board[]> {
  const wanted = typeof limit === "number" ? rows.slice(0, limit) : rows;
  const users = await prisma.user.findMany({
    where: { id: { in: wanted.map((r) => r.userId) } },
    select: {
      id: true,
      members: { select: { fullName: true, photo: true }, orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  const byId = new Map(users.map((u) => [u.id, u.members[0]]));

  return wanted.map((r) => {
    const member = byId.get(r.userId);
    return {
      rank: r.rank,
      userId: r.userId,
      name: member?.fullName ?? "مشارك",
      photoUrl: member?.photo ? `/api/files/member/${member.photo}` : null,
      total: r.total,
    };
  });
}

export interface Standings {
  running: boolean;
  meId: string | null;
  round: number | null;
  group: number | null;
  today: Board[];
  thisWeek: Board[];
  overall: Board[];
  mine: { today: Ranked | null; thisWeek: Ranked | null; overall: Ranked | null } | null;
}

export async function getStandings(
  userId?: string,
  limit = 10,
  now = new Date(),
): Promise<Standings> {
  const competition = await getCompetition();
  const empty: Standings = {
    running: false,
    meId: userId ?? null,
    round: null,
    group: null,
    today: [],
    thisWeek: [],
    overall: [],
    mine: null,
  };
  if (!competition?.startedAt) return empty;

  const scores = await roundScores(competition.id);
  const open = currentRound(shapeOf(competition), now);
  const group = open ? groupOf(open.index, competition.groupSize) : null;

  const dayRows = open ? roundRanking(scores, open.index) : [];
  const weekRows =
    group !== null
      ? groupRanking(scores, competition.groupSize, competition.countingRounds, group)
      : [];
  const allRows = finalRanking(scores, competition.groupSize, competition.countingRounds);

  return {
    running: true,
    meId: userId ?? null,
    round: open?.index ?? null,
    group,
    today: await named(dayRows, limit),
    thisWeek: await named(weekRows, limit),
    overall: await named(allRows, limit),
    mine: userId
      ? {
          today: standingOf(dayRows, userId),
          thisWeek: standingOf(weekRows, userId),
          overall: standingOf(allRows, userId),
        }
      : null,
  };
}

export async function getWinners(now = new Date()) {
  const competition = await getCompetition();
  if (!competition?.startedAt) return { rounds: [], groups: [], overall: null };

  const scores = await roundScores(competition.id);
  const played = [...new Set(scores.map((s) => s.index))].sort((a, b) => a - b);
  const groups = [...new Set(played.map((i) => groupOf(i, competition.groupSize)))]
    .filter((g) => g >= 0)
    .sort((a, b) => a - b);

  const finished = now >= endsAt(shapeOf(competition));

  return {
    rounds: await Promise.all(
      played.map(async (index) => ({
        round: index,
        winner: (await named(roundRanking(scores, index), 1))[0] ?? null,
      })),
    ),
    groups: await Promise.all(
      groups.map(async (group) => ({
        group,
        winner:
          (
            await named(
              groupRanking(scores, competition.groupSize, competition.countingRounds, group),
              1,
            )
          )[0] ?? null,
      })),
    ),
    overall: finished
      ? ((
          await named(finalRanking(scores, competition.groupSize, competition.countingRounds), 1)
        )[0] ?? null)
      : null,
  };
}
