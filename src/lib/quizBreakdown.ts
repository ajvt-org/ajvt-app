import { bandPercent, type SpeedBand } from "./competitionConfig";

export interface AnswerRow {
  position: number;
  question: string;
  category: string;
  maxPoints: number;
  isCorrect: boolean | null;
  elapsedMs: number | null;
  points: number;
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

export function rowPercent(row: AnswerRow, bands: SpeedBand[]): number {
  if (!row.isCorrect || row.elapsedMs === null) return 0;
  return bandPercent(bands, row.elapsedMs);
}

export function breakdownOf(answers: AnswerRow[], bands: SpeedBand[]): Breakdown {
  const rows = [...answers]
    .sort((a, b) => a.position - b.position)
    .map((row) => ({ ...row, percent: rowPercent(row, bands) }));

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

export function bandLabels(bands: SpeedBand[]): { limit: number | null; percent: number }[] {
  return bands.map((band) => ({ limit: band.maxSeconds, percent: band.percent }));
}
