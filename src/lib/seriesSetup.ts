import type { Ladder, LevelRow } from "./matchLevels";
import { isLastLevel } from "./matchLevels";

export interface ColourSetup {
  hasColours: boolean;
  firstColourWord: string | null;
  secondColourWord: string | null;
}

export const MAX_UNIT_COUNT = 99;
export const MAX_LEVELS = 4;

export type LevelProblem =
  | "words"
  | "countedBy"
  | "endsBy"
  | "rulesOnTheLastLevel"
  | "unitCountMissing"
  | "targetMissing"
  | "marginMissing"
  | "continueUnitsMissing"
  | "deciderTargetWithoutATarget"
  | "creditWithoutAWindow"
  | "creditWindowTooWide";

export type LadderProblem = "noLevels" | "tooManyLevels" | "colourWords";

export interface LevelFault {
  order: number;
  problem: LevelProblem;
}

function numberIn(value: number | null, low: number, high: number): boolean {
  return value !== null && Number.isInteger(value) && value >= low && value <= high;
}

function ruleless(level: LevelRow): boolean {
  return (
    level.countedBy === null &&
    level.endsBy === null &&
    level.unitCount === null &&
    level.target === null &&
    level.unsettled === null &&
    level.margin === null &&
    level.continueUnits === null &&
    level.deciderTarget === null &&
    level.startingCredit === 0 &&
    level.creditWindow === 0
  );
}

function endingFault(level: LevelRow): LevelProblem | null {
  if (level.countedBy === null) return "countedBy";
  if (level.endsBy === null) return "endsBy";
  if (level.endsBy === "COUNT") {
    return numberIn(level.unitCount, 1, MAX_UNIT_COUNT) ? null : "unitCountMissing";
  }
  return numberIn(level.target, 1, Number.MAX_SAFE_INTEGER) ? null : "targetMissing";
}

function unsettledFault(level: LevelRow): LevelProblem | null {
  if (level.unsettled !== "CONTINUE") return null;
  if (!numberIn(level.margin, 1, MAX_UNIT_COUNT)) return "marginMissing";
  if (!numberIn(level.continueUnits, 1, MAX_UNIT_COUNT)) return "continueUnitsMissing";
  return null;
}

function creditFault(level: LevelRow): LevelProblem | null {
  if (level.startingCredit < 0 || level.creditWindow < 0) return "creditWithoutAWindow";
  if (level.startingCredit > 0 && level.creditWindow < 1) return "creditWithoutAWindow";
  if (level.endsBy === "COUNT" && level.creditWindow > (level.unitCount ?? 0)) {
    return "creditWindowTooWide";
  }
  return null;
}

export function levelProblem(level: LevelRow, last: boolean): LevelProblem | null {
  if (!level.singular.trim() || !level.plural.trim()) return "words";
  if (last) return ruleless(level) ? null : "rulesOnTheLastLevel";
  return endingFault(level) ?? unsettledFault(level) ?? creditFault(level);
}

export function deciderTargetFault(ladder: Ladder, depth: number): LevelProblem | null {
  const level = ladder[depth];
  if (level.deciderTarget === null) return null;
  return level.endsBy === "TARGET" ? null : "deciderTargetWithoutATarget";
}

export function ladderProblem(ladder: Ladder): LadderProblem | LevelFault | null {
  if (ladder.length === 0) return "noLevels";
  if (ladder.length > MAX_LEVELS) return "tooManyLevels";
  for (let depth = 0; depth < ladder.length; depth += 1) {
    const problem =
      levelProblem(ladder[depth], isLastLevel(ladder, depth)) ?? deciderTargetFault(ladder, depth);
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
