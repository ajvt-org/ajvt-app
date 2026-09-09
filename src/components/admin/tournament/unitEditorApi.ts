import { recordingUnder, type LevelRow, type Recording } from "@/lib/matchLevels";
import type { MoveRuleRow, RecordedMoveRow, UnitRow } from "./seriesTypes";

export interface EditorApi {
  ladder: LevelRow[];
  sides: string[];
  busy: boolean;
  open: boolean;
  rules: MoveRuleRow[];
  moves: RecordedMoveRow[];
  opened: string[];
  onToggle: (unitId: string) => void;
  onAdd: (parentId: string | null, body: Record<string, unknown>) => void;
  onCorrect: (unitId: string, body: Record<string, unknown>) => void;
  onRemove: (unitId: string) => void;
  onRecordMove: (ruleId: string, side: "SIDE_A" | "SIDE_B", unitId: string) => void;
  onUndoMove: (moveId: string) => void;
}

export function levelAt(api: EditorApi, depth: number): LevelRow | null {
  return api.ladder[depth] ?? null;
}

export function recordingAt(api: EditorApi, depth: number): Recording | null {
  return recordingUnder(api.ladder, depth - 1);
}

export function opensOnto(api: EditorApi, depth: number): boolean {
  return levelAt(api, depth + 1) !== null;
}

export function typedScore(unit: UnitRow): boolean {
  return unit.outcome !== null || unit.sideAPoints !== null || unit.sideBPoints !== null;
}

export function movesOn(api: EditorApi, units: UnitRow[]): RecordedMoveRow[] {
  const here = new Set(units.map((unit) => unit.id));
  return api.moves.filter((move) => here.has(move.unitId));
}
