import { matchLevelsSetup as texts } from "./texts";
import type { LevelRow } from "./matchLevels";

export interface ReadBackLevel {
  countedBy: LevelRow["countedBy"];
  endsBy: LevelRow["endsBy"];
  unitCount: number | null;
  target: number | null;
  unsettled: LevelRow["unsettled"];
  margin: number | null;
  continueUnits: number | null;
  deciderTarget: number | null;
  startingCredit: number;
  creditWindow: number;
}

interface Words {
  singular: string;
  plural: string;
}

function unitsOf(count: number | null, words: Words): string {
  if (count === null) return words.plural;
  return count === 1 ? words.singular : `${count} ${words.plural}`;
}

function ending(level: ReadBackLevel, under: Words): string | null {
  const counted = level.countedBy === "POINTS" ? texts.readCountedPoints : texts.readCountedOutcome;
  if (level.endsBy === "COUNT") {
    if (level.unitCount === null) return null;
    return texts.readCount(unitsOf(level.unitCount, under), counted);
  }
  if (level.endsBy === "TARGET") {
    if (level.target === null) return null;
    return texts.readTarget(under.plural, counted, String(level.target));
  }
  return null;
}

function unsettled(level: ReadBackLevel, under: Words): string | null {
  if (level.unsettled === "DRAW") return texts.readDraw;
  if (level.unsettled === "DECIDER") return texts.readDecider(under.singular);
  if (level.unsettled !== "CONTINUE") return null;
  if (level.margin === null || level.continueUnits === null) return null;
  return texts.readContinue(unitsOf(level.continueUnits, under), String(level.margin));
}

function decider(level: ReadBackLevel): string | null {
  if (level.deciderTarget === null) return null;
  return texts.readDeciderTarget(String(level.deciderTarget));
}

function credit(level: ReadBackLevel, under: Words): string | null {
  if (level.startingCredit <= 0 || level.creditWindow <= 0) return null;
  return texts.readCredit(String(level.startingCredit), unitsOf(level.creditWindow, under));
}

export function readBackOf(level: ReadBackLevel, under: Words | null): string {
  if (!under) return texts.readRecorded;
  const said = ending(level, under);
  if (!said) return texts.readUnanswered;
  const rest = [unsettled(level, under), decider(level), credit(level, under)].filter(
    (part): part is string => part !== null,
  );
  return [said, ...rest].join(texts.readSeparator);
}
