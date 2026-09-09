import type { LevelRow } from "@/lib/matchLevels";
import { levelPlace } from "@/lib/seriesSetup";

export interface LevelDraft {
  key: string;
  id: string | null;
  singular: string;
  countedBy: "" | "OUTCOME" | "POINTS";
  endsBy: "" | "COUNT" | "TARGET";
  unitCount: string;
  target: string;
  unsettled: "" | "CONTINUE" | "DECIDER" | "DRAW";
  margin: string;
  continueUnits: string;
  deciderTarget: string;
  startingCredit: string;
  creditWindow: string;
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
    countedBy: "OUTCOME",
    endsBy: "COUNT",
    unitCount: "2",
    target: "",
    unsettled: "DRAW",
    margin: "",
    continueUnits: "",
    deciderTarget: "",
    startingCredit: "0",
    creditWindow: "0",
  };
}

export function draftOfLevel(level: LevelRow): LevelDraft {
  return {
    key: level.id,
    id: level.id,
    singular: level.singular,
    countedBy: level.countedBy ?? "",
    endsBy: level.endsBy ?? "",
    unitCount: asField(level.unitCount),
    target: asField(level.target),
    unsettled: level.unsettled ?? "",
    margin: asField(level.margin),
    continueUnits: asField(level.continueUnits),
    deciderTarget: asField(level.deciderTarget),
    startingCredit: String(level.startingCredit),
    creditWindow: String(level.creditWindow),
  };
}

export function levelOfDraft(draft: LevelDraft, index: number, count: number): LevelRow {
  const place = levelPlace(index, count);
  const rules = place === "above";
  const endsBy = rules ? draft.endsBy || null : null;
  const unsettled = rules ? draft.unsettled || null : null;
  const continues = unsettled === "CONTINUE";
  const continuesByCount = continues && endsBy === "COUNT";
  return {
    id: draft.id ?? "",
    order: index,
    singular: draft.singular.trim(),
    countedBy: place === "last" ? null : draft.countedBy || null,
    endsBy,
    unitCount: endsBy === "COUNT" ? asNumber(draft.unitCount) : null,
    target: endsBy === "TARGET" ? asNumber(draft.target) : null,
    unsettled,
    margin: continues ? asNumber(draft.margin) : null,
    continueUnits: continuesByCount ? asNumber(draft.continueUnits) : null,
    deciderTarget: endsBy === "TARGET" ? asNumber(draft.deciderTarget) : null,
    startingCredit: rules ? (asNumber(draft.startingCredit) ?? 0) : 0,
    creditWindow: rules ? (asNumber(draft.creditWindow) ?? 0) : 0,
  };
}

export function ladderOfDrafts(drafts: LevelDraft[]): LevelRow[] {
  return drafts.map((draft, index) => levelOfDraft(draft, index, drafts.length));
}

export function levelPayload(drafts: LevelDraft[]) {
  return drafts.map((draft, index) => ({
    ...levelOfDraft(draft, index, drafts.length),
    id: draft.id,
    key: draft.key,
  }));
}

export function movedDraft(drafts: LevelDraft[], from: number, to: number): LevelDraft[] {
  if (to < 0 || to >= drafts.length) return drafts;
  const next = [...drafts];
  const [taken] = next.splice(from, 1);
  next.splice(to, 0, taken);
  return next;
}
