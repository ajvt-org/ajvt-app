import { weekOf } from "./quizDay";

export interface DayScore {
  userId: string;
  day: string;
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

export function dailyRanking(scores: DayScore[], day: string): Ranked[] {
  return ranked(
    scores
      .filter((s) => s.day === day)
      .map((s) => ({ userId: s.userId, total: s.score, settledAt: s.finishedAt })),
  );
}

export function countingDays(days: DayScore[], allowance: number): DayScore[] {
  return [...days].sort((a, b) => b.score - a.score).slice(0, Math.max(0, allowance));
}

interface WeekTotal {
  total: number;
  settledAt: Date | null;
}

function totalsByUser(
  scores: DayScore[],
  startsOn: string,
  allowance: number,
  week: number | null,
): Map<string, WeekTotal> {
  const byUserWeek = new Map<string, Map<number, DayScore[]>>();
  for (const score of scores) {
    const at = weekOf(startsOn, score.day);
    if (at < 0) continue;
    if (week !== null && at !== week) continue;
    const weeks = byUserWeek.get(score.userId) ?? new Map<number, DayScore[]>();
    weeks.set(at, [...(weeks.get(at) ?? []), score]);
    byUserWeek.set(score.userId, weeks);
  }

  const out = new Map<string, WeekTotal>();
  for (const [userId, weeks] of byUserWeek) {
    let total = 0;
    let settledAt: Date | null = null;
    for (const days of weeks.values()) {
      for (const day of countingDays(days, allowance)) {
        total += day.score;
        if (day.finishedAt && (!settledAt || day.finishedAt > settledAt)) {
          settledAt = day.finishedAt;
        }
      }
    }
    out.set(userId, { total, settledAt });
  }
  return out;
}

export function weeklyRanking(
  scores: DayScore[],
  startsOn: string,
  allowance: number,
  week: number,
): Ranked[] {
  const totals = totalsByUser(scores, startsOn, allowance, week);
  return ranked(
    [...totals].map(([userId, t]) => ({ userId, total: t.total, settledAt: t.settledAt })),
  );
}

export function finalRanking(scores: DayScore[], startsOn: string, allowance: number): Ranked[] {
  const totals = totalsByUser(scores, startsOn, allowance, null);
  return ranked(
    [...totals].map(([userId, t]) => ({ userId, total: t.total, settledAt: t.settledAt })),
  );
}

export function standingOf(rows: Ranked[], userId: string): Ranked | null {
  return rows.find((r) => r.userId === userId) ?? null;
}
