// Day arithmetic for the tournament spine. Positions are 1-based and dense;
// a day's date is startsAt + (position - 1) days, all at UTC midnight like
// Activity.startsAt itself. Shifting whole days adds whole days to matchDate,
// which keeps each match's stored time of day.

import { fromClubWallClock, matchDateKey, toClubWallClock } from "./clubTime";

export const DAY_MS = 86_400_000;

export interface DayLike {
  position: number;
  isRest: boolean;
}

export function dayDate(startsAt: Date, position: number): Date {
  return new Date(startsAt.getTime() + (position - 1) * DAY_MS);
}

export function endsAtFor(startsAt: Date, dayCount: number): Date | null {
  if (dayCount < 1) return null;
  return dayDate(startsAt, dayCount);
}

export function atTime(day: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const wall = toClubWallClock(day);
  wall.setUTCHours(h || 0, m || 0, 0, 0);
  return fromClubWallClock(wall.getTime());
}

export function timeOf(date: Date): string {
  return toClubWallClock(date).toISOString().slice(11, 16);
}

function clubDayNumber(date: Date): number {
  const key = matchDateKey(date);
  const [y, m, d] = key.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export interface DerivedPlan {
  startsAt: Date;
  days: { position: number; isRest: boolean }[];
  positionByMatch: number[];
}

// Rebuilds the day plan from already-dated matches: each distinct club-local
// day becomes a match day, uncovered days between them become rest days, and
// the plan starts at the earlier of startsAt and the first match.
export function derivePlan(startsAt: Date | null, matchDates: Date[]): DerivedPlan | null {
  if (matchDates.length === 0) return null;

  const numbers = matchDates.map(clubDayNumber);
  const first = Math.min(startsAt ? clubDayNumber(startsAt) : Infinity, ...numbers);
  const last = Math.max(...numbers);
  const matchDays = new Set(numbers);

  const days = [];
  for (let n = first; n <= last; n++) {
    days.push({ position: n - first + 1, isRest: !matchDays.has(n) });
  }

  return {
    startsAt: startsAt ?? fromClubWallClock(first * DAY_MS),
    days,
    positionByMatch: numbers.map((n) => n - first + 1),
  };
}
