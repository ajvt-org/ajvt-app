import { levelProblem, type LevelProblem } from "@/lib/seriesSetup";
import { isLastLevel, type Ladder } from "@/lib/matchLevels";
import { ruleProblem, type RuleProblem } from "@/lib/moveRules";
import type { LevelDraft } from "./levelDraft";
import type { MoveDraft } from "./moveDraft";

export type FaultField =
  | "words"
  | "countedBy"
  | "endsBy"
  | "unitCount"
  | "target"
  | "unsettled"
  | "margin"
  | "continueUnits"
  | "deciderTarget"
  | "startingCredit"
  | "creditWindow";

const FIELD_OF: Record<LevelProblem, FaultField> = {
  words: "words",
  countedBy: "countedBy",
  endsBy: "endsBy",
  rulesOnTheLastLevel: "endsBy",
  unitCountMissing: "unitCount",
  targetMissing: "target",
  marginMissing: "margin",
  continueUnitsMissing: "continueUnits",
  deciderTargetWithoutATarget: "deciderTarget",
  creditWithoutAWindow: "creditWindow",
  creditWindowTooWide: "creditWindow",
};

export interface LevelFix {
  problem: LevelProblem;
  field: FaultField;
  patch: Partial<LevelDraft> | null;
}

const CLEARED: Partial<LevelDraft> = {
  countedBy: "",
  endsBy: "",
  unitCount: "",
  target: "",
  unsettled: "",
  margin: "",
  continueUnits: "",
  deciderTarget: "",
  startingCredit: "0",
  creditWindow: "0",
};

function patchFor(problem: LevelProblem, draft: LevelDraft): Partial<LevelDraft> | null {
  if (problem === "rulesOnTheLastLevel") return CLEARED;
  if (problem === "deciderTargetWithoutATarget") return { deciderTarget: "" };
  if (problem === "creditWithoutAWindow") return { creditWindow: "1" };
  if (problem === "creditWindowTooWide") return { creditWindow: draft.unitCount || "1" };
  return null;
}

export function levelFix(level: Ladder[number], draft: LevelDraft, last: boolean): LevelFix | null {
  const problem = levelProblem(level, last);
  if (!problem) return null;
  return { problem, field: FIELD_OF[problem], patch: patchFor(problem, draft) };
}

export function levelFixes(ladder: Ladder, drafts: LevelDraft[]): (LevelFix | null)[] {
  return drafts.map((draft, index) => levelFix(ladder[index], draft, isLastLevel(ladder, index)));
}

export function moveFixes(moves: MoveDraft[], keys: string[]): (RuleProblem | null)[] {
  const declared = new Set(keys);
  return moves.map((move) =>
    ruleProblem({
      name: move.name,
      levelId: declared.has(move.levelKey) ? move.levelKey : "",
      unitsToSelf: Number(move.unitsToSelf || 0),
      unitsFromOther: Number(move.unitsFromOther || 0),
      endsUnit: move.endsUnit,
      unitWorth: move.unitWorth.trim() === "" ? null : Number(move.unitWorth),
    }),
  );
}
