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
  sideAHalves: number;
  sideBHalves: number;
  partsRecorded: number;
  partsScored: number;
  partsLeft: number;
  partsAllowed: number;
  target: number | null;
  over: boolean;
  level: boolean;
  extending: boolean;
  winner: "SIDE_A" | "SIDE_B" | null;
}

export interface SeriesState {
  parts: PartRow[];
  standing: SeriesStandingRow;
}
