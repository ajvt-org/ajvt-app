import { matchDateKey } from "./clubTime";

const DAY_MS = 86_400_000;

function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export type ActivityStanding =
  | { state: "upcoming"; daysUntil: number }
  | { state: "today" }
  | { state: "running" }
  | { state: "finished" }
  | null;

export function activityStanding(
  a: { startsAt: string | Date | null; endsAt?: string | Date | null },
  now = new Date(),
): ActivityStanding {
  if (!a.startsAt) return null;
  const today = dayNumber(matchDateKey(now));
  const start = dayNumber(matchDateKey(a.startsAt));
  const end = a.endsAt ? dayNumber(matchDateKey(a.endsAt)) : start;
  if (today < start) return { state: "upcoming", daysUntil: start - today };
  if (today > end) return { state: "finished" };
  if (today === start) return { state: "today" };
  return { state: "running" };
}
