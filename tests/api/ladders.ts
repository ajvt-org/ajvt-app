import type { Prisma } from "@prisma/client";

export type LevelFixture = Omit<Prisma.MatchLevelCreateWithoutActivityInput, "order">;

export const MATCH_LEVEL: LevelFixture = {
  singular: "المباراة",
  plural: "المباريات",
  countedBy: "OUTCOME",
  endsBy: "COUNT",
  unitCount: 2,
  unsettled: "DRAW",
};

export const CHESS_LEVELS: LevelFixture[] = [MATCH_LEVEL, { singular: "لعبة", plural: "ألعاب" }];

export const KNOCKOUT_LEVELS: LevelFixture[] = [
  { ...MATCH_LEVEL, unsettled: "CONTINUE", margin: 1, continueUnits: 2 },
  CHESS_LEVELS[1],
];

export const SCORED_LEVELS: LevelFixture[] = [
  {
    ...MATCH_LEVEL,
    countedBy: "POINTS",
    endsBy: "TARGET",
    unitCount: null,
    target: 200,
  },
  { singular: "جولة", plural: "جولات" },
];

export const DEEP_LEVELS: LevelFixture[] = [
  { ...MATCH_LEVEL, unsettled: "DECIDER" },
  {
    singular: "شوط",
    plural: "أشواط",
    countedBy: "OUTCOME",
    endsBy: "TARGET",
    target: 3,
  },
  { singular: "نقطة", plural: "نقاط" },
];

export function ladderData(levels: LevelFixture[]) {
  return { create: levels.map((level, order) => ({ ...level, order })) };
}
