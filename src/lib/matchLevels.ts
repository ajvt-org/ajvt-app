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

export function countedUnits(count: number, level: LevelRow): string {
  return count === 1 ? level.singular : `${count} ${level.plural}`;
}

export function definiteUnits(level: LevelRow): string {
  return level.plural.startsWith("ال") ? level.plural : `ال${level.plural}`;
}

export function countsPoints(level: LevelRow): boolean {
  return level.countedBy === "POINTS";
}
