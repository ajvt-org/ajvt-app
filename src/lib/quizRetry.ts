export interface RetryRow {
  isCorrect: boolean | null;
  answeredAt: Date | null;
  shownAt: Date | null;
}

export function isMissed(row: RetryRow, maxSeconds: number, now: Date): boolean {
  if (row.answeredAt !== null) return row.isCorrect === null;
  if (row.shownAt === null) return false;
  return now.getTime() - row.shownAt.getTime() > maxSeconds * 1000;
}

export function missedAnswers<T extends RetryRow>(rows: T[], maxSeconds: number, now: Date): T[] {
  return rows.filter((row) => isMissed(row, maxSeconds, now));
}
