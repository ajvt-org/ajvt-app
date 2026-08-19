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

interface GroupTotal {
  total: number;
  settledAt: Date | null;
}

function totalsByUser(
  scores: RoundScore[],
  groupSize: number,
  allowance: number,
  group: number | null,
): Map<string, GroupTotal> {
  const byUserGroup = new Map<string, Map<number, RoundScore[]>>();
  for (const score of scores) {
    const at = groupOf(score.index, groupSize);
    if (at < 0) continue;
    if (group !== null && at !== group) continue;
    const groups = byUserGroup.get(score.userId) ?? new Map<number, RoundScore[]>();
    groups.set(at, [...(groups.get(at) ?? []), score]);
    byUserGroup.set(score.userId, groups);
  }

  const out = new Map<string, GroupTotal>();
  for (const [userId, byGroup] of byUserGroup) {
    let total = 0;
    let settledAt: Date | null = null;
    for (const rounds of byGroup.values()) {
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

export function groupRanking(
  scores: RoundScore[],
  groupSize: number,
  allowance: number,
  group: number,
): Ranked[] {
  const totals = totalsByUser(scores, groupSize, allowance, group);
  return ranked(
    [...totals].map(([userId, t]) => ({ userId, total: t.total, settledAt: t.settledAt })),
  );
}

export function finalRanking(scores: RoundScore[], groupSize: number, allowance: number): Ranked[] {
  const totals = totalsByUser(scores, groupSize, allowance, null);
  return ranked(
    [...totals].map(([userId, t]) => ({ userId, total: t.total, settledAt: t.settledAt })),
  );
}

export function standingOf(rows: Ranked[], userId: string): Ranked | null {
  return rows.find((r) => r.userId === userId) ?? null;
}
