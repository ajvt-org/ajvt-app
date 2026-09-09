import { ladderOf, type Ladder, type LevelRow } from "@/lib/matchLevels";
import { ladderProblem } from "@/lib/seriesSetup";
import type { TournamentInfo } from "./useTournamentData";

export interface SeriesConfig {
  ladder: Ladder;
  match: LevelRow;
  unit: LevelRow;
  hasColours: boolean;
  firstColourWord: string | null;
  secondColourWord: string | null;
}

export function configOfLadder(
  levels: LevelRow[],
  colours: Pick<SeriesConfig, "hasColours" | "firstColourWord" | "secondColourWord">,
): SeriesConfig | null {
  const ladder = ladderOf(levels);
  if (ladderProblem(ladder) !== null) return null;
  return { ladder, match: ladder[0], unit: ladder[1] ?? ladder[0], ...colours };
}

export function seriesConfigOf(info: TournamentInfo | null): SeriesConfig | null {
  if (!info || info.matchShape !== "SERIES") return null;
  return configOfLadder(info.levels, {
    hasColours: info.hasColours,
    firstColourWord: info.firstColourWord,
    secondColourWord: info.secondColourWord,
  });
}
