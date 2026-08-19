import { prisma } from "./prisma";
import { getCompetition, shapeOf } from "./competitionServer";
import { currentRound, endsAt, groupOf, roundIndexAt } from "./quizRound";
import { boardRanking, standingOf, type RoundScore, type Ranked } from "./quizRanking";

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

export interface StandingsBoard {
  id: string;
  title: string;
  rows: Board[];
  mine: Ranked | null;
}

export interface Standings {
  running: boolean;
  competitionId: string | null;
  name: string | null;
  meId: string | null;
  round: number | null;
  boards: StandingsBoard[];
}

export async function getStandings(
  competitionId: string | null,
  userId?: string,
  limit = 10,
  now = new Date(),
): Promise<Standings> {
  const competition = competitionId ? await getCompetition(competitionId) : null;
  const empty: Standings = {
    running: false,
    competitionId: competition?.id ?? null,
    name: competition?.name ?? null,
    meId: userId ?? null,
    round: null,
    boards: [],
  };
  if (!competition?.startedAt) return empty;

  const scores = await roundScores(competition.id);
  const at =
    currentRound(shapeOf(competition), now)?.index ?? roundIndexAt(shapeOf(competition), now);

  const boards: StandingsBoard[] = [];
  for (const board of competition.boards) {
    const rows = boardRanking(scores, board, at);
    boards.push({
      id: board.id,
      title: board.title,
      rows: await named(rows, limit),
      mine: userId ? standingOf(rows, userId) : null,
    });
  }

  return {
    running: true,
    competitionId: competition.id,
    name: competition.name,
    meId: userId ?? null,
    round: at,
    boards,
  };
}

export async function getWinners(competitionId: string, now = new Date()) {
  const competition = await getCompetition(competitionId);
  if (!competition?.startedAt) return { boards: [] };

  const scores = await roundScores(competition.id);
  const played = [...new Set(scores.map((s) => s.index))].sort((a, b) => a - b);
  const finished = now >= endsAt(shapeOf(competition));

  const boards = [];
  for (const board of competition.boards) {
    const size = Math.max(1, board.blockRounds);

    if (board.wholeRun) {
      const winner = finished
        ? ((await named(boardRanking(scores, board, played[played.length - 1] ?? 0), 1))[0] ?? null)
        : null;
      boards.push({
        id: board.id,
        title: board.title,
        wholeRun: true,
        winners: [{ block: null, winner }],
      });
      continue;
    }

    const blocks = [...new Set(played.map((i) => groupOf(i, size)))]
      .filter((b) => b >= 0)
      .sort((a, b) => a - b);
    boards.push({
      id: board.id,
      title: board.title,
      wholeRun: false,
      winners: await Promise.all(
        blocks.map(async (block) => ({
          block,
          winner: (await named(boardRanking(scores, board, block * size), 1))[0] ?? null,
        })),
      ),
    });
  }

  return { boards };
}
