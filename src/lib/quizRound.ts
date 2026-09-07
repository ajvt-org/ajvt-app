export interface RoundShape {
  startsAt: Date;
  roundCount: number;
  roundPeriodMinutes: number;
  roundWindowMinutes: number;
}

export interface RoundWindow {
  index: number;
  opensAt: Date;
  closesAt: Date;
}

export type RoundState = "before" | "open" | "closed" | "over";

const MINUTE = 60_000;

export function roundWindows(shape: RoundShape): RoundWindow[] {
  const window = Math.min(shape.roundWindowMinutes, shape.roundPeriodMinutes);
  return Array.from({ length: Math.max(0, shape.roundCount) }, (_, index) => {
    const opensAt = new Date(shape.startsAt.getTime() + index * shape.roundPeriodMinutes * MINUTE);
    return { index, opensAt, closesAt: new Date(opensAt.getTime() + window * MINUTE) };
  });
}

export function windowAt(shape: RoundShape, index: number): RoundWindow | null {
  if (!Number.isInteger(index) || index < 0 || index >= shape.roundCount) return null;
  const window = Math.min(shape.roundWindowMinutes, shape.roundPeriodMinutes);
  const opensAt = new Date(shape.startsAt.getTime() + index * shape.roundPeriodMinutes * MINUTE);
  return { index, opensAt, closesAt: new Date(opensAt.getTime() + window * MINUTE) };
}

export function currentRound(shape: RoundShape, now: Date): RoundWindow | null {
  const elapsed = now.getTime() - shape.startsAt.getTime();
  if (elapsed < 0) return null;
  const index = Math.floor(elapsed / (shape.roundPeriodMinutes * MINUTE));
  const window = windowAt(shape, index);
  if (!window) return null;
  return now < window.closesAt ? window : null;
}

export function roundIndexAt(shape: RoundShape, now: Date): number {
  const elapsed = now.getTime() - shape.startsAt.getTime();
  if (elapsed < 0) return 0;
  const index = Math.floor(elapsed / (shape.roundPeriodMinutes * MINUTE));
  return Math.min(Math.max(0, shape.roundCount - 1), index);
}

export function roundInPlay(shape: RoundShape, now: Date): number {
  return currentRound(shape, now)?.index ?? roundIndexAt(shape, now);
}

export function roundsBegun(shape: RoundShape, now: Date): number {
  if (now < shape.startsAt) return 0;
  const elapsed = now.getTime() - shape.startsAt.getTime();
  return Math.min(shape.roundCount, Math.floor(elapsed / (shape.roundPeriodMinutes * MINUTE)) + 1);
}

export function roundState(shape: RoundShape, now: Date): RoundState {
  if (now < shape.startsAt) return "before";
  if (now >= endsAt(shape)) return "over";
  return currentRound(shape, now) ? "open" : "closed";
}

export function nextWindow(shape: RoundShape, now: Date): RoundWindow | null {
  if (now < shape.startsAt) return windowAt(shape, 0);
  const elapsed = now.getTime() - shape.startsAt.getTime();
  return windowAt(shape, Math.floor(elapsed / (shape.roundPeriodMinutes * MINUTE)) + 1);
}

export function endsAt(shape: RoundShape): Date {
  const last = windowAt(shape, shape.roundCount - 1);
  return last ? last.closesAt : shape.startsAt;
}

export function groupOf(index: number, groupSize: number): number {
  if (groupSize <= 0 || index < 0) return -1;
  return Math.floor(index / groupSize);
}

export function groupCount(roundCount: number, groupSize: number): number {
  if (groupSize <= 0) return 0;
  return Math.ceil(roundCount / groupSize);
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

export function seededShuffle<T>(items: T[], seed: string): T[] {
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
