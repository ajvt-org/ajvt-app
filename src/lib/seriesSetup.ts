import type { MatchEnding, PartDecision } from "@prisma/client";

export interface SeriesSetup {
  partsPerMatch: number | null;
  matchEnding: MatchEnding | null;
  partsToWin: number | null;
  partDecision: PartDecision | null;
  partTarget: number | null;
  partWord: string | null;
  partsWord: string | null;
}

export const MAX_PARTS_PER_MATCH = 25;

export type SeriesSetupProblem =
  | "partsPerMatch"
  | "matchEnding"
  | "partDecision"
  | "partWords"
  | "targetOnAnOutcome"
  | "targetOnAFreeScore"
  | "targetMissing"
  | "partsToWinUnused"
  | "partsToWinMissing"
  | "partsToWinUnreachable";

export function seriesSetupProblem(setup: SeriesSetup): SeriesSetupProblem | null {
  const parts = setup.partsPerMatch;
  if (!Number.isInteger(parts) || parts === null || parts < 1 || parts > MAX_PARTS_PER_MATCH) {
    return "partsPerMatch";
  }
  if (setup.matchEnding === null) return "matchEnding";
  if (setup.partDecision === null) return "partDecision";
  if (!setup.partWord?.trim() || !setup.partsWord?.trim()) return "partWords";

  if (setup.partDecision === "OUTCOME" && setup.partTarget !== null) return "targetOnAnOutcome";
  if (setup.partDecision === "SCORE" && setup.partTarget !== null) return "targetOnAFreeScore";
  if (setup.partDecision === "POINTS") {
    if (!Number.isInteger(setup.partTarget) || (setup.partTarget ?? 0) < 1) return "targetMissing";
  }

  if (setup.matchEnding === "PLAY_ALL" && setup.partsToWin !== null) return "partsToWinUnused";
  if (setup.matchEnding === "FIRST_TO") {
    const toWin = setup.partsToWin;
    if (!Number.isInteger(toWin) || toWin === null || toWin < 1) return "partsToWinMissing";
    if (toWin > parts) return "partsToWinUnreachable";
  }
  return null;
}

export function isSeriesConfigured(setup: SeriesSetup): boolean {
  return seriesSetupProblem(setup) === null;
}
