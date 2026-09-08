import type { BothPastTarget, MatchEnding, PartDecision } from "@prisma/client";

export interface LevelRow {
  id: string;
  order: number;
  singular: string;
  plural: string;
  ending: MatchEnding | null;
  unitsPerParent: number | null;
  unitsToWin: number | null;
  target: number | null;
  deciderTarget: number | null;
  bothPastTarget: BothPastTarget | null;
  extendsWhenLevel: boolean;
  extensionUnits: number;
  startingCredit: number;
  creditWindow: number;
  halvesPerUnit: number;
  decision: PartDecision | null;
  wonUnitWorth: number;
  doubledWorth: number;
  doublesOnBlankOpponent: boolean;
  doublesOnRecoveredCredit: boolean;
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

export function scoredLevel(level: LevelRow): boolean {
  return level.ending === "FIRST_PAST";
}
