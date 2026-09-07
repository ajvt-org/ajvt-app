import type { Ladder, LevelRow } from "./matchLevels";
import { isLastLevel, scoredLevel } from "./matchLevels";

export interface ColourSetup {
  hasColours: boolean;
  firstColourWord: string | null;
  secondColourWord: string | null;
}

export const MAX_UNITS_PER_PARENT = 99;
export const MAX_LEVELS = 4;

export type LevelProblem =
  | "words"
  | "unitsPerParent"
  | "ending"
  | "decision"
  | "endingOnTheLastLevel"
  | "unitsToWinUnused"
  | "unitsToWinMissing"
  | "unitsToWinUnreachable"
  | "targetUnused"
  | "targetMissing"
  | "targetWithoutAScoredLevel"
  | "bothPastTargetUnused"
  | "deciderTargetOnPlayAll"
  | "creditWithoutAWindow"
  | "creditWindowTooWide"
  | "halvesPerUnit"
  | "worth"
  | "extensionUnits";

export type LadderProblem = "noLevels" | "tooManyLevels" | "colourWords";

export interface LevelFault {
  order: number;
  problem: LevelProblem;
}

function numberIn(value: number | null, low: number, high: number): boolean {
  return value !== null && Number.isInteger(value) && value >= low && value <= high;
}

function endingFault(level: LevelRow, last: boolean): LevelProblem | null {
  if (last) {
    return level.ending === null && level.unitsPerParent === null ? null : "endingOnTheLastLevel";
  }
  if (level.ending === null) return "ending";
  if (!numberIn(level.unitsPerParent, 1, MAX_UNITS_PER_PARENT)) return "unitsPerParent";
  return null;
}

function thresholdFault(level: LevelRow): LevelProblem | null {
  if (level.ending === "FIRST_TO") {
    if (level.target !== null) return "targetUnused";
    if (!numberIn(level.unitsToWin, 1, MAX_UNITS_PER_PARENT)) return "unitsToWinMissing";
    if ((level.unitsToWin ?? 0) > (level.unitsPerParent ?? 0)) return "unitsToWinUnreachable";
    return null;
  }
  if (level.ending === "FIRST_PAST") {
    if (level.unitsToWin !== null) return "unitsToWinUnused";
    if (!numberIn(level.target, 1, Number.MAX_SAFE_INTEGER)) return "targetMissing";
    if (level.bothPastTarget === null) return "bothPastTargetUnused";
    return null;
  }
  if (level.unitsToWin !== null) return "unitsToWinUnused";
  if (level.target !== null) return "targetUnused";
  if (level.deciderTarget !== null) return "deciderTargetOnPlayAll";
  return null;
}

function creditFault(level: LevelRow): LevelProblem | null {
  if (level.startingCredit < 0 || level.creditWindow < 0) return "creditWithoutAWindow";
  if (level.startingCredit > 0 && level.creditWindow < 1) return "creditWithoutAWindow";
  if (level.creditWindow > (level.unitsPerParent ?? 0)) return "creditWindowTooWide";
  return null;
}

function unitFault(level: LevelRow, first: boolean): LevelProblem | null {
  if (!level.singular.trim() || !level.plural.trim()) return "words";
  if (first === (level.decision !== null)) return "decision";
  if (level.halvesPerUnit < 1) return "halvesPerUnit";
  if (level.wonUnitWorth < 1 || level.doubledWorth < level.wonUnitWorth) return "worth";
  if (level.extendsWhenLevel && level.extensionUnits < 1) return "extensionUnits";
  return null;
}

export function levelProblem(level: LevelRow, first: boolean, last: boolean): LevelProblem | null {
  const words = unitFault(level, first);
  if (words) return words;
  const ending = endingFault(level, last);
  if (ending) return ending;
  if (last) return null;
  const threshold = thresholdFault(level);
  if (threshold) return threshold;
  return creditFault(level);
}

export function scoredChildFault(ladder: Ladder, depth: number): LevelProblem | null {
  const level = ladder[depth];
  if (!scoredLevel(level)) return null;
  const child = ladder[depth + 1];
  if (!child || child.decision !== "SCORE") return "targetWithoutAScoredLevel";
  return null;
}

export function ladderProblem(ladder: Ladder): LadderProblem | LevelFault | null {
  if (ladder.length === 0) return "noLevels";
  if (ladder.length > MAX_LEVELS) return "tooManyLevels";
  for (let depth = 0; depth < ladder.length; depth += 1) {
    const problem =
      levelProblem(ladder[depth], depth === 0, isLastLevel(ladder, depth)) ??
      scoredChildFault(ladder, depth);
    if (problem) return { order: ladder[depth].order, problem };
  }
  return null;
}

export function colourProblem(setup: ColourSetup): LadderProblem | null {
  if (setup.hasColours && (!setup.firstColourWord?.trim() || !setup.secondColourWord?.trim())) {
    return "colourWords";
  }
  return null;
}

export function isSeriesConfigured(levels: Ladder, colours: ColourSetup): boolean {
  return ladderProblem(levels) === null && colourProblem(colours) === null;
}
