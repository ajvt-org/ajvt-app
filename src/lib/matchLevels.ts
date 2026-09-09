import type { CountedBy, EndsBy, Unsettled } from "@prisma/client";

export interface LevelRow {
  id: string;
  order: number;
  singular: string;
  plural: string;
  countedBy: CountedBy | null;
  endsBy: EndsBy | null;
  unitCount: number | null;
  target: number | null;
  unsettled: Unsettled | null;
  margin: number | null;
  continueUnits: number | null;
  deciderTarget: number | null;
  startingCredit: number;
  creditWindow: number;
}

export type Ladder = LevelRow[];

export function ladderOf(levels: LevelRow[]): Ladder {
  return [...levels].sort((one, two) => one.order - two.order);
}

export function levelAt(ladder: Ladder, depth: number): LevelRow | null {
  return ladder[depth] ?? null;
}

export function childLevelAt(ladder: Ladder, depth: number): LevelRow | null {
  return levelAt(ladder, depth + 1);
}

export function isLastLevel(ladder: Ladder, depth: number): boolean {
  return depth === ladder.length - 1;
}

export interface Recording {
  level: LevelRow;
  parent: LevelRow;
}

export function recordsOnItself(ladder: Ladder): boolean {
  return ladder.length === 1;
}

export function recordingUnder(ladder: Ladder, depth: number): Recording | null {
  const parent = ladder[depth];
  if (!parent) return null;
  if (recordsOnItself(ladder)) return depth === 0 ? { level: parent, parent } : null;
  const level = ladder[depth + 1];
  return level ? { level, parent } : null;
}

export function parentOfLevel(ladder: Ladder, levelId: string): LevelRow | null {
  const at = ladder.findIndex((level) => level.id === levelId);
  if (at < 0) return null;
  if (recordsOnItself(ladder)) return ladder[0];
  return at < 1 ? null : ladder[at - 1];
}

export function scorelineUnits<T>(ladder: Ladder, units: T[]): T[] {
  return recordsOnItself(ladder) ? [] : units;
}

export function countedUnits(count: number, level: LevelRow): string {
  return count === 1 ? level.singular : `${count} ${level.plural}`;
}

export function definiteUnits(level: LevelRow): string {
  return level.plural.startsWith("ال") ? level.plural : `ال${level.plural}`;
}

export function countsPoints(level: LevelRow): boolean {
  return level.countedBy === "POINTS";
}
