import type { LevelRow } from "@/lib/matchLevels";

export type { LevelRow };

export interface PartRow {
  id: string;
  order: number;
  abandoned: boolean;
  outcome: "SIDE_A" | "SIDE_B" | "DRAW" | null;
  sideAPoints: number | null;
  sideBPoints: number | null;
  sideAColour: "FIRST" | "SECOND" | null;
}

export interface SeriesStandingRow {
  sideATotal: number;
  sideBTotal: number;
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
  order: number;
  side: "SIDE_A" | "SIDE_B";
  rule: AdjustmentRuleRow;
}

export interface SeriesState {
  parts: PartRow[];
  adjustments: RecordedAdjustmentRow[];
  levels: LevelRow[];
  standing: SeriesStandingRow;
}
