import { isPowerOfTwo } from "./tournament";
import type { StandingsRow } from "./standings";

export const QUALIFY_PER_GROUP = 2;

export interface QualifierSlot {
  teamId: string;
  name: string;
  groupId: string;
  groupName: string;
  position: number;
}

export interface SuggestedPair {
  home: QualifierSlot;
  away: QualifierSlot;
}

export type SuggestionProblem = "notGrouped" | "groupCount" | "groupTooSmall" | "unresolvedTie";

export interface BracketSuggestion {
  pairs: SuggestedPair[];
  problem: SuggestionProblem | null;
}

export interface SuggestionGroup {
  id: string;
  name: string;
  standings: StandingsRow[];
}

function slot(group: SuggestionGroup, position: number): QualifierSlot {
  const row = group.standings[position - 1];
  return {
    teamId: row.teamId,
    name: row.name,
    groupId: group.id,
    groupName: group.name,
    position,
  };
}

function blocker(groups: SuggestionGroup[]): SuggestionProblem | null {
  if (groups.length < 2) return "notGrouped";
  if (!isPowerOfTwo(groups.length)) return "groupCount";
  if (groups.some((g) => g.standings.length < QUALIFY_PER_GROUP)) return "groupTooSmall";
  return null;
}

function warning(groups: SuggestionGroup[]): SuggestionProblem | null {
  const shaky = groups.some((g) =>
    g.standings.slice(0, QUALIFY_PER_GROUP + 1).some((row) => row.unresolved),
  );
  return shaky ? "unresolvedTie" : null;
}

export function suggestFirstKnockoutRound(groups: SuggestionGroup[]): BracketSuggestion {
  const problem = blocker(groups);
  if (problem) return { pairs: [], problem };

  const winner = (i: number) => slot(groups[i], 1);
  const runnerUp = (i: number) => slot(groups[i], 2);

  const topHalf: SuggestedPair[] = [];
  const bottomHalf: SuggestedPair[] = [];
  for (let i = 0; i < groups.length; i++) {
    if (i % 2 === 0) topHalf.push({ home: winner(i), away: runnerUp(i + 1) });
    else bottomHalf.push({ home: winner(i), away: runnerUp(i - 1) });
  }

  return { pairs: [...topHalf, ...bottomHalf], problem: warning(groups) };
}

export function meetingRound(pairs: SuggestedPair[], teamA: string, teamB: string): number | null {
  const at = (teamId: string) =>
    pairs.findIndex((p) => p.home.teamId === teamId || p.away.teamId === teamId);
  const a = at(teamA);
  const b = at(teamB);
  if (a === -1 || b === -1) return null;
  if (a === b) return 1;
  let round = 1;
  let x = a;
  let y = b;
  while (x !== y) {
    x = Math.floor(x / 2);
    y = Math.floor(y / 2);
    round++;
  }
  return round;
}
