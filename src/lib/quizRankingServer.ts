import { prisma } from "./prisma";
import { NotFoundError } from "./errors";
import { getCompetition, shapeOf } from "./competitionServer";
import {
  currentRound,
  endsAt,
  groupOf,
  nextWindow,
  roundIndexAt,
  roundState,
  windowAt,
  type RoundState,
} from "./quizRound";
import {
  blockAnchor,
  boardBlocks,
  myRound,
  standingOf,
  type MyRound,
  type RoundScore,
  type Ranked,
} from "./quizRanking";
import { rankBoard } from "./quizRankingSql";
import type { ScoreCurve } from "./competitionConfig";
import { sharedResult } from "./sharedResult";

export const STANDINGS_TTL_MS = 10_000;

export interface Board {
  rank: number;
  userId: string;
  name: string;
  photoUrl: string | null;
  total: number;
}

async function named(rows: Ranked[], limit?: number): Promise<Board[]> {
  const wanted = typeof limit === "number" ? rows.slice(0, limit) : rows;
  const users = await prisma.user.findMany({
    where: { id: { in: wanted.map((r) => r.userId) } },
    select: { id: true, fullName: true, photo: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

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
  blockTitle: string;
  blockRounds: number;
  counting: number;
  wholeRun: boolean;
  block: number;
  blocks: number;
  rows: Board[];
  mine: Ranked | null;
  blockOpensAt: Date | null;
  blockClosesAt: Date | null;
}

type SharedBoard = Omit<StandingsBoard, "mine">;

interface SharedStandings {
  boards: SharedBoard[];
  ranked: Ranked[][];
}

type Competition = NonNullable<Awaited<ReturnType<typeof getCompetition>>>;

async function sharedStandings(
  competition: Competition,
  at: number,
  limit: number,
): Promise<SharedStandings> {
  const boards: SharedBoard[] = [];
  const ranked: Ranked[][] = [];
  for (const board of competition.boards) {
    const rows = await rankBoard(competition.id, board, at);
    ranked.push(rows);
    const blockInfo = boardBlocks(board, at);
    const size = Math.max(1, board.blockRounds);
    const isBlock = board.blockRounds > 1 && !board.wholeRun;
    const firstIndex = isBlock ? blockInfo.block * size : 0;
    const lastIndex = isBlock
      ? Math.min((blockInfo.block + 1) * size - 1, competition.roundCount - 1)
      : competition.roundCount - 1;
    const shape = shapeOf(competition);
    boards.push({
      id: board.id,
      title: board.title,
      blockTitle: board.blockTitle,
      blockRounds: board.blockRounds,
      counting: board.counting,
      wholeRun: board.wholeRun,
      ...blockInfo,
      rows: await named(rows, limit),
      blockOpensAt: isBlock ? (windowAt(shape, firstIndex)?.opensAt ?? null) : null,
      blockClosesAt: isBlock ? (windowAt(shape, lastIndex)?.closesAt ?? null) : null,
    });
  }
  return { boards, ranked };
}

async function myRoundOf(competitionId: string, userId: string, at: number): Promise<MyRound> {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { userId, round: { competitionId, index: at } },
    select: { score: true, finishedAt: true, voidedAt: true },
  });
  const scores: RoundScore[] = attempt
    ? [
        {
          userId,
          index: at,
          score: attempt.voidedAt ? 0 : attempt.score,
          finishedAt: attempt.finishedAt,
        },
      ]
    : [];
  return myRound(scores, userId, at);
}

export interface Standings {
  running: boolean;
  competitionId: string | null;
  name: string | null;
  meId: string | null;
  round: number | null;
  roundCount: number | null;
  state: RoundState | null;
  next: { index: number; opensAt: Date } | null;
  closesAt: Date | null;
  me: { played: boolean; finished: boolean; score: number | null } | null;
  curve: ScoreCurve | null;
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
    roundCount: null,
    state: null,
    next: null,
    closesAt: null,
    me: null,
    curve: null,
    boards: [],
  };
  if (!competition?.startedAt) return empty;

  const at =
    currentRound(shapeOf(competition), now)?.index ?? roundIndexAt(shapeOf(competition), now);

  const shared = await sharedResult(
    `standings:${competition.id}:${at}:${limit}`,
    now.getTime(),
    STANDINGS_TTL_MS,
    () => sharedStandings(competition, at, limit),
  );
  const boards: StandingsBoard[] = shared.boards.map((board, i) => ({
    ...board,
    mine: userId ? standingOf(shared.ranked[i], userId) : null,
  }));

  const coming = nextWindow(shapeOf(competition), now);
  const openNow = currentRound(shapeOf(competition), now);
  return {
    running: true,
    competitionId: competition.id,
    name: competition.name,
    meId: userId ?? null,
    round: at,
    roundCount: competition.roundCount,
    state: roundState(shapeOf(competition), now),
    next: coming ? { index: coming.index, opensAt: coming.opensAt } : null,
    closesAt: openNow ? openNow.closesAt : null,
    me: userId ? await myRoundOf(competition.id, userId, at) : null,
    curve: {
      fullSeconds: competition.fullSeconds,
      maxSeconds: competition.maxSeconds,
      floorPercent: competition.floorPercent,
    },
    boards,
  };
}

export const NO_BOARD = "لا يوجد هذا الترتيب";

export async function boardBlock(
  competitionId: string,
  boardId: string,
  block: number,
  userId?: string,
  limit = 10,
  now = new Date(),
) {
  const competition = await getCompetition(competitionId);
  if (!competition?.startedAt) throw new NotFoundError(NO_BOARD);
  const board = competition.boards.find((b) => b.id === boardId);
  if (!board) throw new NotFoundError(NO_BOARD);

  const current =
    currentRound(shapeOf(competition), now)?.index ?? roundIndexAt(shapeOf(competition), now);
  const rows = await rankBoard(competition.id, board, blockAnchor(board, block, current));
  return {
    rows: await named(rows, limit),
    mine: userId ? standingOf(rows, userId) : null,
  };
}

async function playedRounds(competitionId: string): Promise<number[]> {
  const rounds = await prisma.quizAttempt.findMany({
    where: { round: { competitionId } },
    select: { round: { select: { index: true } } },
    distinct: ["roundId"],
  });
  return [...new Set(rounds.map((r) => r.round.index))].sort((a, b) => a - b);
}

export async function getWinners(competitionId: string, now = new Date()) {
  const competition = await getCompetition(competitionId);
  if (!competition?.startedAt) return { boards: [] };

  const played = await playedRounds(competition.id);
  const finished = now >= endsAt(shapeOf(competition));

  const boards = [];
  for (const board of competition.boards) {
    const size = Math.max(1, board.blockRounds);

    if (board.wholeRun) {
      const winner = finished
        ? ((
            await named(await rankBoard(competition.id, board, played[played.length - 1] ?? 0), 1)
          )[0] ?? null)
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
          winner: (await named(await rankBoard(competition.id, board, block * size), 1))[0] ?? null,
        })),
      ),
    });
  }

  return { boards };
}
