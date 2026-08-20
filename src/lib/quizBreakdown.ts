import { curvePercent, type ScoreCurve } from "./competitionConfig";
import type { RoundWindow } from "./quizRound";

export interface RoundEntry<T> {
  window: RoundWindow;
  attempt: T | null;
}

export function roundEntries<T>(
  windows: RoundWindow[],
  attemptAt: Map<number, T>,
  now: Date,
): RoundEntry<T>[] {
  const entries: RoundEntry<T>[] = [];
  for (const window of windows) {
    if (now < window.opensAt) break;
    const attempt = attemptAt.get(window.index) ?? null;
    if (!attempt && now < window.closesAt) continue;
    entries.push({ window, attempt });
  }
  return entries;
}

export interface AnswerRow {
  position: number;
  question: string;
  category: string;
  maxPoints: number;
  isCorrect: boolean | null;
  elapsedMs: number | null;
  points: number;
  correct: string[];
  chosen: string[];
}

export interface BreakdownRow extends AnswerRow {
  percent: number;
}

export interface Breakdown {
  rows: BreakdownRow[];
  correct: number;
  answered: number;
  total: number;
  score: number;
  possible: number;
  elapsedMs: number;
}

export interface MemberRow {
  position: number;
  question: string;
  category: string;
  maxPoints: number;
  isCorrect: boolean | null;
  points: number;
}

export interface MemberBreakdown {
  rows: MemberRow[];
  correct: number;
  answered: number;
  total: number;
  score: number;
  possible: number;
}

export function memberBreakdown(breakdown: Breakdown): MemberBreakdown {
  return {
    rows: breakdown.rows.map(({ position, question, category, maxPoints, isCorrect, points }) => ({
      position,
      question,
      category,
      maxPoints,
      isCorrect,
      points,
    })),
    correct: breakdown.correct,
    answered: breakdown.answered,
    total: breakdown.total,
    score: breakdown.score,
    possible: breakdown.possible,
  };
}

export function rowPercent(row: AnswerRow, curve: ScoreCurve): number {
  if (!row.isCorrect || row.elapsedMs === null) return 0;
  return Math.round(curvePercent(curve, row.elapsedMs));
}

export function breakdownOf(answers: AnswerRow[], curve: ScoreCurve): Breakdown {
  const rows = [...answers]
    .sort((a, b) => a.position - b.position)
    .map((row) => ({ ...row, percent: rowPercent(row, curve) }));

  return {
    rows,
    correct: rows.filter((r) => r.isCorrect === true).length,
    answered: rows.filter((r) => r.isCorrect !== null).length,
    total: rows.length,
    score: rows.reduce((sum, r) => sum + r.points, 0),
    possible: rows.reduce((sum, r) => sum + r.maxPoints, 0),
    elapsedMs: rows.reduce((sum, r) => sum + (r.elapsedMs ?? 0), 0),
  };
}
