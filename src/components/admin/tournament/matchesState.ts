import type { Group, Match, TournamentFormat } from "./types";

export interface MatchesState {
  bracketMatches: (Match & { bracketRound: number })[];
  maxBracketRound: number;
  finalRound: (Match & { bracketRound: number })[];
  bracketIsFinalDone: boolean;
  canAdvanceBracket: boolean;
  firstRoundWaiting: boolean;
  firstRoundRedoable: boolean;
  groupStageDone: boolean;
  knockoutLocked: boolean;
  isTwoGroupFormat: boolean;
  groupStageComplete: boolean;
}

export function matchesState({
  format,
  groups,
  matches,
}: {
  format: TournamentFormat;
  groups: Group[];
  matches: Match[];
}): MatchesState {
  const hasGroupStage = format === "GROUPS_THEN_KNOCKOUT";

  const bracketMatches = matches.filter((m) => m.bracketRound !== null) as (Match & {
    bracketRound: number;
  })[];
  const maxBracketRound =
    bracketMatches.length > 0 ? Math.max(...bracketMatches.map((m) => m.bracketRound)) : 0;
  const finalRound = bracketMatches.filter((m) => m.bracketRound === maxBracketRound);
  const bracketIsFinalDone = finalRound.length === 1 && finalRound[0].status === "PLAYED";

  const leagueMatches = matches.filter((m) => !m.isKnockout);
  const groupStageDone =
    leagueMatches.length > 0 && leagueMatches.every((m) => m.status === "PLAYED");

  const isTwoGroupFormat = hasGroupStage && groups.length === 2;

  const firstRound = bracketMatches.filter((m) => m.bracketRound === 1);
  const bracketUntouched =
    bracketMatches.length > 0 && bracketMatches.every((m) => m.status === "SCHEDULED");
  const firstRoundWaiting =
    firstRound.length > 0 &&
    bracketUntouched &&
    firstRound.every((m) => m.homeTeam === null && m.awayTeam === null);
  const firstRoundRedoable = firstRound.length > 0 && bracketUntouched && !firstRoundWaiting;

  return {
    bracketMatches,
    maxBracketRound,
    finalRound,
    bracketIsFinalDone,
    canAdvanceBracket: bracketMatches.length > 0 && !bracketIsFinalDone && !firstRoundWaiting,
    firstRoundWaiting,
    firstRoundRedoable,
    groupStageDone,
    knockoutLocked: hasGroupStage && groups.length > 0 && !groupStageDone,
    isTwoGroupFormat,
    groupStageComplete:
      isTwoGroupFormat && groupStageDone && (bracketMatches.length === 0 || firstRoundWaiting),
  };
}
