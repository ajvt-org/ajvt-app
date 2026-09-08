import type { LevelRow } from "@/lib/matchLevels";

export interface LevelDraft {
  key: string;
  id: string | null;
  singular: string;
  plural: string;
  ending: "" | "PLAY_ALL" | "FIRST_TO" | "FIRST_PAST";
  unitsPerParent: string;
  unitsToWin: string;
  target: string;
  deciderTarget: string;
  bothPastTarget: "" | "HIGHER_TOTAL" | "PLAY_ON";
  extendsWhenLevel: boolean;
  extensionUnits: string;
  startingCredit: string;
  creditWindow: string;
  halvesPerUnit: string;
  decision: "" | "OUTCOME" | "SCORE";
  wonUnitWorth: string;
  doubledWorth: string;
  doublesOnBlankOpponent: boolean;
  doublesOnRecoveredCredit: boolean;
}

const asField = (value: number | null) => (value === null ? "" : String(value));

const asNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

export function blankDraft(key: string): LevelDraft {
  return {
    key,
    id: null,
    singular: "",
    plural: "",
    ending: "PLAY_ALL",
    unitsPerParent: "2",
    unitsToWin: "",
    target: "",
    deciderTarget: "",
    bothPastTarget: "",
    extendsWhenLevel: false,
    extensionUnits: "0",
    startingCredit: "0",
    creditWindow: "0",
    halvesPerUnit: "2",
    decision: "OUTCOME",
    wonUnitWorth: "1",
    doubledWorth: "1",
    doublesOnBlankOpponent: false,
    doublesOnRecoveredCredit: false,
  };
}

export function draftOfLevel(level: LevelRow): LevelDraft {
  return {
    key: level.id,
    id: level.id,
    singular: level.singular,
    plural: level.plural,
    ending: level.ending ?? "",
    unitsPerParent: asField(level.unitsPerParent),
    unitsToWin: asField(level.unitsToWin),
    target: asField(level.target),
    deciderTarget: asField(level.deciderTarget),
    bothPastTarget: level.bothPastTarget ?? "",
    extendsWhenLevel: level.extendsWhenLevel,
    extensionUnits: String(level.extensionUnits),
    startingCredit: String(level.startingCredit),
    creditWindow: String(level.creditWindow),
    halvesPerUnit: String(level.halvesPerUnit),
    decision: level.decision ?? "",
    wonUnitWorth: String(level.wonUnitWorth),
    doubledWorth: String(level.doubledWorth),
    doublesOnBlankOpponent: level.doublesOnBlankOpponent,
    doublesOnRecoveredCredit: level.doublesOnRecoveredCredit,
  };
}

export function levelOfDraft(draft: LevelDraft, index: number, count: number): LevelRow {
  const first = index === 0;
  const last = index === count - 1;
  const ending = last ? null : draft.ending || null;
  return {
    id: draft.id ?? "",
    order: index,
    singular: draft.singular.trim(),
    plural: draft.plural.trim(),
    ending,
    unitsPerParent: last ? null : asNumber(draft.unitsPerParent),
    unitsToWin: ending === "FIRST_TO" ? asNumber(draft.unitsToWin) : null,
    target: ending === "FIRST_PAST" ? asNumber(draft.target) : null,
    deciderTarget: ending === null || ending === "PLAY_ALL" ? null : asNumber(draft.deciderTarget),
    bothPastTarget: ending === "FIRST_PAST" ? draft.bothPastTarget || null : null,
    extendsWhenLevel: last ? false : draft.extendsWhenLevel,
    extensionUnits: asNumber(draft.extensionUnits) ?? 0,
    startingCredit: last ? 0 : (asNumber(draft.startingCredit) ?? 0),
    creditWindow: last ? 0 : (asNumber(draft.creditWindow) ?? 0),
    halvesPerUnit: asNumber(draft.halvesPerUnit) ?? 2,
    decision: first ? null : draft.decision || null,
    wonUnitWorth: asNumber(draft.wonUnitWorth) ?? 1,
    doubledWorth: asNumber(draft.doubledWorth) ?? 1,
    doublesOnBlankOpponent: first ? false : draft.doublesOnBlankOpponent,
    doublesOnRecoveredCredit: first ? false : draft.doublesOnRecoveredCredit,
  };
}

export function ladderOfDrafts(drafts: LevelDraft[]): LevelRow[] {
  return drafts.map((draft, index) => levelOfDraft(draft, index, drafts.length));
}

export function movedDraft(drafts: LevelDraft[], from: number, to: number): LevelDraft[] {
  if (to < 0 || to >= drafts.length) return drafts;
  const next = [...drafts];
  const [taken] = next.splice(from, 1);
  next.splice(to, 0, taken);
  return next;
}
