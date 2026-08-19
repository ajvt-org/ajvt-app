import { groupOf } from "./quizRound";

export interface RoundScore {
  userId: string;
  index: number;
  score: number;
  finishedAt: Date | null;
}

export interface Ranked {
  rank: number;
  userId: string;
  total: number;
  settledAt: Date | null;
}

function order(a: Omit<Ranked, "rank">, b: Omit<Ranked, "rank">): number {
  if (b.total !== a.total) return b.total - a.total;
  if (a.settledAt && b.settledAt) return a.settledAt.getTime() - b.settledAt.getTime();
  if (a.settledAt) return -1;
  if (b.settledAt) return 1;
  return a.userId.localeCompare(b.userId);
}

function ranked(rows: Omit<Ranked, "rank">[]): Ranked[] {
  return [...rows].sort(order).map((row, i) => ({ rank: i + 1, ...row }));
}

export function roundRanking(scores: RoundScore[], index: number): Ranked[] {
  return ranked(
    scores
      .filter((s) => s.index === index)
      .map((s) => ({ userId: s.userId, total: s.score, settledAt: s.finishedAt })),
  );
}

export function bestRounds(rounds: RoundScore[], allowance: number): RoundScore[] {
  return [...rounds].sort((a, b) => b.score - a.score).slice(0, Math.max(0, allowance));
}

interface BlockTotal {
  total: number;
  settledAt: Date | null;
}

export interface BoardShape {
  blockRounds: number;
  counting: number;
  wholeRun: boolean;
}

function blockOf(index: number, blockRounds: number): number {
  return groupOf(index, Math.max(1, blockRounds));
}

function totalsByUser(
  scores: RoundScore[],
  board: BoardShape,
  at: number,
): Map<string, BlockTotal> {
  const size = Math.max(1, board.blockRounds);
  const only = board.wholeRun ? null : blockOf(at, size);
  const allowance = board.counting > 0 ? board.counting : size;

  const byUserBlock = new Map<string, Map<number, RoundScore[]>>();
  for (const score of scores) {
    const block = blockOf(score.index, size);
    if (block < 0) continue;
    if (only !== null && block !== only) continue;
    const blocks = byUserBlock.get(score.userId) ?? new Map<number, RoundScore[]>();
    blocks.set(block, [...(blocks.get(block) ?? []), score]);
    byUserBlock.set(score.userId, blocks);
  }

  const out = new Map<string, BlockTotal>();
  for (const [userId, blocks] of byUserBlock) {
    let total = 0;
    let settledAt: Date | null = null;
    for (const rounds of blocks.values()) {
      for (const round of bestRounds(rounds, allowance)) {
        total += round.score;
        if (round.finishedAt && (!settledAt || round.finishedAt > settledAt)) {
          settledAt = round.finishedAt;
        }
      }
    }
    out.set(userId, { total, settledAt });
  }
  return out;
}

export function boardRanking(scores: RoundScore[], board: BoardShape, at: number): Ranked[] {
  const totals = totalsByUser(scores, board, at);
  return ranked(
    [...totals].map(([userId, t]) => ({ userId, total: t.total, settledAt: t.settledAt })),
  );
}

export function standingOf(rows: Ranked[], userId: string): Ranked | null {
  return rows.find((r) => r.userId === userId) ?? null;
}
