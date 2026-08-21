export const WAITING_DAYS = 7;

export interface WaitingRow {
  id: string;
  userId: string | null;
  name: string;
  since: string;
  days: number;
}

export function daysWaiting(since: Date, now: Date): number {
  return Math.floor((now.getTime() - since.getTime()) / 86_400_000);
}

export function isOverdue(since: Date, now: Date, days = WAITING_DAYS): boolean {
  return daysWaiting(since, now) >= days;
}

export function longestFirst(rows: WaitingRow[]): WaitingRow[] {
  return [...rows].sort((a, b) => b.days - a.days || a.name.localeCompare(b.name));
}
