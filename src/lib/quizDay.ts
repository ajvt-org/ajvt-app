import { dayStamps } from "./competitionConfig";

export interface DayWindow {
  publishMinutes: number;
  cutoffMinutes: number;
}

export type DayState = "before" | "open" | "closed" | "outside";

export function stampOf(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function minutesOf(now: Date): number {
  return now.getUTCHours() * 60 + now.getUTCMinutes();
}

export function competitionDay(
  startsOn: string,
  days: number,
  now: Date,
): { day: string; index: number } | null {
  const today = stampOf(now);
  const stamps = dayStamps(startsOn, days);
  const index = stamps.indexOf(today);
  return index === -1 ? null : { day: today, index };
}

export function dayState(startsOn: string, days: number, window: DayWindow, now: Date): DayState {
  if (!competitionDay(startsOn, days, now)) return "outside";
  const minutes = minutesOf(now);
  if (minutes < window.publishMinutes) return "before";
  if (minutes >= window.cutoffMinutes) return "closed";
  return "open";
}

export function isOpen(startsOn: string, days: number, window: DayWindow, now: Date): boolean {
  return dayState(startsOn, days, window, now) === "open";
}

export function weekOf(startsOn: string, day: string): number {
  const start = new Date(`${startsOn}T00:00:00.000Z`).getTime();
  const at = new Date(`${day}T00:00:00.000Z`).getTime();
  const offset = Math.floor((at - start) / 86_400_000);
  return offset < 0 ? -1 : Math.floor(offset / 7);
}

export function drawQuestions(pool: string[], count: number, seed: string): string[] {
  const ordered = [...pool].sort();
  const picked: string[] = [];
  const taken = new Set<number>();
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) % 2_147_483_647;

  const wanted = Math.min(count, ordered.length);
  let step = 0;
  while (picked.length < wanted) {
    hash = (hash * 1_103_515_245 + 12_345 + step) % 2_147_483_647;
    const index = hash % ordered.length;
    step++;
    if (taken.has(index)) continue;
    taken.add(index);
    picked.push(ordered[index]);
  }
  return picked;
}

export function seededShuffle(items: string[], seed: string): string[] {
  const out = [...items];
  let hash = 7;
  for (const ch of seed) hash = (hash * 33 + ch.charCodeAt(0)) % 2_147_483_647;
  for (let i = out.length - 1; i > 0; i--) {
    hash = (hash * 1_103_515_245 + 12_345) % 2_147_483_647;
    const j = hash % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
