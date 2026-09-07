import type { LevelRow } from "@/lib/matchLevels";
import type { SeriesConfig } from "@/components/admin/tournament/seriesConfig";
import type { SeriesStandingRow } from "@/components/admin/tournament/seriesTypes";

export const BLANK_LEVEL: LevelRow = {
  id: "level",
  order: 0,
  singular: "المباراة",
  plural: "المباريات",
  ending: null,
  unitsPerParent: null,
  unitsToWin: null,
  target: null,
  deciderTarget: null,
  bothPastTarget: null,
  extendsWhenLevel: false,
  extensionUnits: 2,
  startingCredit: 0,
  creditWindow: 0,
  halvesPerUnit: 2,
  decision: null,
  wonUnitWorth: 1,
  doubledWorth: 1,
  doublesOnBlankOpponent: false,
  doublesOnRecoveredCredit: false,
};

export function levelRow(over: Partial<LevelRow> = {}): LevelRow {
  return { ...BLANK_LEVEL, ...over };
}

export function ladderConfig(
  match: Partial<LevelRow>,
  unit: Partial<LevelRow>,
  colours: Partial<Pick<SeriesConfig, "hasColours" | "firstColourWord" | "secondColourWord">> = {},
): SeriesConfig {
  const matchLevel = levelRow({ id: "match", order: 0, ending: "PLAY_ALL", ...match });
  const unitLevel = levelRow({ id: "unit", order: 1, decision: "OUTCOME", ...unit });
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
  { unitsPerParent: 2 },
  { singular: "لعبة", plural: "ألعاب", decision: "OUTCOME" },
  { hasColours: true, firstColourWord: "أبيض", secondColourWord: "أسود" },
);

export const SCORED_CONFIG = ladderConfig(
  { ending: "FIRST_TO", unitsPerParent: 3, unitsToWin: 2 },
  { singular: "جولة", plural: "جولات", decision: "SCORE" },
);

export function standingRow(over: Partial<SeriesStandingRow> = {}): SeriesStandingRow {
  return {
    sideATotal: 0,
    sideBTotal: 0,
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
