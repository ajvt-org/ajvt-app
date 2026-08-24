import type { Group, Match, Team, TournamentFormat } from "./types";

export interface MatchesState {
  bracketMatches: (Match & { bracketRound: number })[];
  maxBracketRound: number;
  finalRound: (Match & { bracketRound: number })[];
  bracketIsFinalDone: boolean;
  canAdvanceBracket: boolean;
  poolsReady: boolean;
  groupStageDone: boolean;
  knockoutLocked: boolean;
  isTwoGroupFormat: boolean;
  groupStageComplete: boolean;
}

export function matchesState({
  format,
  groups,
  teams,
  matches,
}: {
  format: TournamentFormat;
  groups: Group[];
  teams: Team[];
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

  const poolsReady =
    hasGroupStage &&
    groups.length > 0 &&
    groups.every(
      (g) => g.capacity != null && teams.filter((t) => t.groupId === g.id).length >= g.capacity,
    ) &&
    matches.length === 0;

  const leagueMatches = matches.filter((m) => !m.isKnockout);
  const groupStageDone =
    leagueMatches.length > 0 && leagueMatches.every((m) => m.status === "PLAYED");

  const isTwoGroupFormat = hasGroupStage && groups.length === 2;

  return {
    bracketMatches,
    maxBracketRound,
    finalRound,
    bracketIsFinalDone,
    canAdvanceBracket: bracketMatches.length > 0 && !bracketIsFinalDone,
    poolsReady,
    groupStageDone,
    knockoutLocked: hasGroupStage && groups.length > 0 && !groupStageDone,
    isTwoGroupFormat,
    groupStageComplete: isTwoGroupFormat && groupStageDone && bracketMatches.length === 0,
  };
}
