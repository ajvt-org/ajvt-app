import type { LevelRow } from "@/lib/matchLevels";

export type { LevelRow };

export interface UnitRow {
  id: string;
  levelId: string;
  order: number;
  abandoned: boolean;
  outcome: "SIDE_A" | "SIDE_B" | "DRAW" | null;
  sideAPoints: number | null;
  sideBPoints: number | null;
  sideAColour: "FIRST" | "SECOND" | null;
  worth: number | null;
  sideALostCredit: boolean;
  sideBLostCredit: boolean;
  decider: boolean;
  endedBy: AdjustmentRuleRow | null;
  children: UnitRow[];
  standing: SeriesStandingRow | null;
}

export interface SeriesStandingRow {
  sideATotal: number;
  sideBTotal: number;
  sideALostCredit: boolean;
  sideBLostCredit: boolean;
  scored: boolean;
  perUnit: number;
  unitsRecorded: number;
  unitsScored: number;
  unitsLeft: number;
  unitsAllowed: number;
  target: number | null;
  over: boolean;
  level: boolean;
  extending: boolean;
  winner: "SIDE_A" | "SIDE_B" | null;
}

export interface AdjustmentRuleRow {
  id: string;
  name: string;
  unitsToSelf: number;
  unitsFromOther: number;
  levelId: string | null;
  endsUnit: boolean;
}

export interface RecordedAdjustmentRow {
  id: string;
  unitId: string;
  side: "SIDE_A" | "SIDE_B";
  rule: AdjustmentRuleRow;
}

export interface SeriesState {
  units: UnitRow[];
  adjustments: RecordedAdjustmentRow[];
  levels: LevelRow[];
  standing: SeriesStandingRow;
}
