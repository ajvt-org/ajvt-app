import type { Prisma } from "@prisma/client";

export const STILL_TO_PLAY = {
  status: "SCHEDULED",
  forfeitWinnerTeamId: null,
} satisfies Prisma.MatchWhereInput;
