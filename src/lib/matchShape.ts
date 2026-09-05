import type { MatchShape } from "@prisma/client";

export function isFootball(matchShape: MatchShape): boolean {
  return matchShape === "FOOTBALL";
}
