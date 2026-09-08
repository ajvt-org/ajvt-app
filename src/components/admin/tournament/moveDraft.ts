import type { MoveRuleRow } from "./seriesTypes";

export interface MoveDraft {
  key: string;
  id: string | null;
  levelKey: string;
  name: string;
  unitsToSelf: string;
  unitsFromOther: string;
  endsUnit: boolean;
  unitWorth: string;
}

export function blankMove(key: string, levelKey: string): MoveDraft {
  return {
    key,
    id: null,
    levelKey,
    name: "",
    unitsToSelf: "0",
    unitsFromOther: "0",
    endsUnit: false,
    unitWorth: "",
  };
}

export function draftOfMove(move: MoveRuleRow): MoveDraft {
  return {
    key: move.id,
    id: move.id,
    levelKey: move.levelId,
    name: move.name,
    unitsToSelf: String(move.unitsToSelf),
    unitsFromOther: String(move.unitsFromOther),
    endsUnit: move.endsUnit,
    unitWorth: move.unitWorth === null ? "" : String(move.unitWorth),
  };
}

export function movePayload(draft: MoveDraft) {
  return {
    id: draft.id,
    levelKey: draft.levelKey,
    name: draft.name.trim(),
    unitsToSelf: Number(draft.unitsToSelf || 0),
    unitsFromOther: Number(draft.unitsFromOther || 0),
    endsUnit: draft.endsUnit,
    unitWorth: draft.unitWorth.trim() === "" ? null : Number(draft.unitWorth),
  };
}
