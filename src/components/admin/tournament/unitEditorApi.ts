import type { LevelRow } from "@/lib/matchLevels";
import type { AdjustmentRuleRow, RecordedAdjustmentRow, UnitRow } from "./seriesTypes";

export interface EditorApi {
  ladder: LevelRow[];
  sides: string[];
  busy: boolean;
  open: boolean;
  rules: AdjustmentRuleRow[];
  adjustments: RecordedAdjustmentRow[];
  opened: string[];
  onToggle: (unitId: string) => void;
  onAdd: (parentId: string | null, body: Record<string, unknown>) => void;
  onCorrect: (unitId: string, body: Record<string, unknown>) => void;
  onRemove: (unitId: string) => void;
  onRecordMove: (ruleId: string, side: "SIDE_A" | "SIDE_B", unitId: string) => void;
  onUndoMove: (adjustmentId: string) => void;
}

export function levelAt(api: EditorApi, depth: number): LevelRow | null {
  return api.ladder[depth] ?? null;
}

export function opensOnto(api: EditorApi, depth: number): boolean {
  return levelAt(api, depth + 1) !== null;
}

export function typedScore(unit: UnitRow): boolean {
  return unit.outcome !== null || unit.sideAPoints !== null || unit.sideBPoints !== null;
}

export function movesOn(api: EditorApi, units: UnitRow[]): RecordedAdjustmentRow[] {
  const here = new Set(units.map((unit) => unit.id));
  return api.adjustments.filter((move) => here.has(move.unitId));
}
