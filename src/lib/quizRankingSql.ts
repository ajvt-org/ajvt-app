import { prisma } from "./prisma";
import type { BoardShape, Ranked } from "./quizRanking";

interface RankedRow {
  userId: string;
  total: number;
  settledAt: Date | null;
  rank: number;
}

export function blockFilter(board: BoardShape, at: number): { size: number; only: number | null } {
  const size = Math.max(1, board.blockRounds);
  return { size, only: board.wholeRun ? null : Math.floor(Math.max(0, at) / size) };
}

export async function rankBoard(
  competitionId: string,
  board: BoardShape,
  at: number,
): Promise<Ranked[]> {
  const { size, only } = blockFilter(board, at);
  const allowance = board.counting > 0 ? board.counting : size;

  const rows = await prisma.$queryRaw<RankedRow[]>`
    WITH scored AS (
      SELECT a."userId" AS "userId",
             a.score AS score,
             a."finishedAt" AS "finishedAt",
             (r."index" / ${size}::int) AS block
      FROM "QuizAttempt" a
      JOIN "QuizRound" r ON r.id = a."roundId"
      WHERE r."competitionId" = ${competitionId}
    ),
    picked AS (
      SELECT "userId", score, "finishedAt", block,
             ROW_NUMBER() OVER (
               PARTITION BY "userId", block
               ORDER BY score DESC, "finishedAt" ASC NULLS LAST
             ) AS rn
      FROM scored
      WHERE ${only}::int IS NULL OR block = ${only}::int
    ),
    totals AS (
      SELECT "userId",
             SUM(score)::int AS total,
             MAX("finishedAt") AS "settledAt"
      FROM picked
      WHERE rn <= ${allowance}::int
      GROUP BY "userId"
    )
    SELECT "userId", total, "settledAt",
           (ROW_NUMBER() OVER (
             ORDER BY total DESC, "settledAt" ASC NULLS LAST, "userId" ASC
           ))::int AS rank
    FROM totals
    ORDER BY rank
  `;

  return rows.map((row) => ({
    rank: row.rank,
    userId: row.userId,
    total: row.total,
    settledAt: row.settledAt,
  }));
}
