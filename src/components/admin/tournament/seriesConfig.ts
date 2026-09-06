import type { TournamentInfo } from "./useTournamentData";

export interface SeriesConfig {
  partsPerMatch: number;
  matchEnding: "PLAY_ALL" | "FIRST_TO";
  partsToWin: number | null;
  partDecision: "OUTCOME" | "POINTS" | "SCORE";
  partTarget: number | null;
  partWord: string;
  partsWord: string;
  hasColours: boolean;
  firstColourWord: string | null;
  secondColourWord: string | null;
}

export function seriesConfigOf(info: TournamentInfo | null): SeriesConfig | null {
  if (!info || info.matchShape !== "SERIES") return null;
  if (
    info.partsPerMatch === null ||
    info.matchEnding === null ||
    info.partDecision === null ||
    !info.partWord ||
    !info.partsWord
  ) {
    return null;
  }
  return {
    partsPerMatch: info.partsPerMatch,
    matchEnding: info.matchEnding,
    partsToWin: info.partsToWin,
    partDecision: info.partDecision,
    partTarget: info.partTarget,
    partWord: info.partWord,
    partsWord: info.partsWord,
    hasColours: info.hasColours,
    firstColourWord: info.firstColourWord,
    secondColourWord: info.secondColourWord,
  };
}
