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
  worthRuleId: string | null;
  worthKept: boolean;
  sideALostCredit: boolean;
  sideBLostCredit: boolean;
  decider: boolean;
  endedBy: MoveRuleRow | null;
  children: UnitRow[];
  standing: SeriesStandingRow | null;
}

export interface SeriesStandingRow {
  sideATotal: number;
  sideBTotal: number;
  sideAAtClose: number;
  sideBAtClose: number;
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
  unsettled: boolean;
  extending: boolean;
  winner: "SIDE_A" | "SIDE_B" | null;
}

export interface MoveRuleRow {
  id: string;
  name: string;
  unitsToSelf: number;
  unitsFromOther: number;
  levelId: string;
  endsUnit: boolean;
  unitWorth: number | null;
}

export interface RecordedMoveRow {
  id: string;
  unitId: string;
  side: "SIDE_A" | "SIDE_B";
  rule: MoveRuleRow;
}

export interface WorthRuleRow {
  id: string;
  name: string;
  levelId: string;
  when: "LOSER_ON_NOTHING" | "WINNER_LOST_CREDIT";
  worth: number;
}

export interface SeriesState {
  units: UnitRow[];
  moves: RecordedMoveRow[];
  levels: LevelRow[];
  worthRules: WorthRuleRow[];
  standing: SeriesStandingRow;
}
