import type { Prisma } from "@prisma/client";

export type LevelFixture = Omit<Prisma.MatchLevelCreateWithoutActivityInput, "order">;

export const MATCH_LEVEL: LevelFixture = {
  singular: "المباراة",
  plural: "المباريات",
  ending: "PLAY_ALL",
  unitsPerParent: 2,
  halvesPerUnit: 2,
};

export const CHESS_LEVELS: LevelFixture[] = [
  MATCH_LEVEL,
  { singular: "لعبة", plural: "ألعاب", decision: "OUTCOME" },
];

export const KNOCKOUT_LEVELS: LevelFixture[] = [
  { ...MATCH_LEVEL, extendsWhenLevel: true, extensionUnits: 2 },
  CHESS_LEVELS[1],
];

export const SCORED_LEVELS: LevelFixture[] = [
  { ...MATCH_LEVEL, ending: "FIRST_TO", unitsPerParent: 3, unitsToWin: 2 },
  { singular: "جولة", plural: "جولات", decision: "SCORE" },
];

export function ladderData(levels: LevelFixture[]) {
  return { create: levels.map((level, order) => ({ ...level, order })) };
}
