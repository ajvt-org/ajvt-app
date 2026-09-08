import type { LevelRow } from "@/lib/matchLevels";
import type { SeriesConfig } from "@/components/admin/tournament/seriesConfig";
import type {
  SeriesStandingRow,
  UnitRow as UnitNodeShape,
} from "@/components/admin/tournament/seriesTypes";

export const BLANK_LEVEL: LevelRow = {
  id: "level",
  order: 0,
  singular: "المباراة",
  plural: "المباريات",
  countedBy: null,
  endsBy: null,
  unitCount: null,
  target: null,
  unsettled: null,
  margin: null,
  continueUnits: null,
  deciderTarget: null,
  startingCredit: 0,
  creditWindow: 0,
};

export function levelRow(over: Partial<LevelRow> = {}): LevelRow {
  return { ...BLANK_LEVEL, ...over };
}

export function ladderConfig(
  match: Partial<LevelRow>,
  unit: Partial<LevelRow>,
  colours: Partial<Pick<SeriesConfig, "hasColours" | "firstColourWord" | "secondColourWord">> = {},
): SeriesConfig {
  const matchLevel = levelRow({
    id: "match",
    order: 0,
    countedBy: "OUTCOME",
    endsBy: "COUNT",
    unsettled: "DRAW",
    ...match,
  });
  const unitLevel = levelRow({ id: "unit", order: 1, ...unit });
  return {
    ladder: [matchLevel, unitLevel],
    match: matchLevel,
    unit: unitLevel,
    hasColours: false,
    firstColourWord: null,
    secondColourWord: null,
    ...colours,
  };
}

export const CHESS_CONFIG = ladderConfig(
  { unitCount: 2 },
  { singular: "لعبة", plural: "ألعاب" },
  { hasColours: true, firstColourWord: "أبيض", secondColourWord: "أسود" },
);

export function unitNode(over: Partial<UnitNodeShape> & { id: string; order: number }) {
  return {
    levelId: "unit",
    abandoned: false,
    outcome: null,
    sideAPoints: null,
    sideBPoints: null,
    sideAColour: null,
    worth: null,
    sideALostCredit: false,
    sideBLostCredit: false,
    decider: false,
    endedBy: null,
    children: [],
    standing: null,
    ...over,
  };
}

export const SCORED_CONFIG = ladderConfig(
  { countedBy: "POINTS", endsBy: "TARGET", target: 200 },
  { singular: "جولة", plural: "جولات" },
);

export function standingRow(over: Partial<SeriesStandingRow> = {}): SeriesStandingRow {
  return {
    sideATotal: 0,
    sideBTotal: 0,
    sideALostCredit: false,
    sideBLostCredit: false,
    scored: false,
    perUnit: 2,
    unitsRecorded: 0,
    unitsScored: 0,
    unitsLeft: 2,
    unitsAllowed: 2,
    target: null,
    over: false,
    level: true,
    extending: false,
    winner: null,
    ...over,
  };
}
