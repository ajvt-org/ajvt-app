import { isPowerOfTwo } from "./tournament";
import { pairQualifierSlots } from "./knockoutSlots";
import type { StandingsRow } from "./standings";

export const DEFAULT_QUALIFIERS_PER_GROUP = 2;

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

export type SuggestionProblem = "notGrouped" | "qualifierCount" | "groupTooSmall" | "unresolvedTie";

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

function blocker(groups: SuggestionGroup[], perGroup: number): SuggestionProblem | null {
  if (groups.length < 2) return "notGrouped";
  if (!isPowerOfTwo(groups.length * perGroup)) return "qualifierCount";
  if (groups.some((g) => g.standings.length < perGroup)) return "groupTooSmall";
  return null;
}

function warning(groups: SuggestionGroup[], perGroup: number): SuggestionProblem | null {
  const shaky = groups.some((g) => g.standings.slice(0, perGroup).some((row) => row.unresolved));
  return shaky ? "unresolvedTie" : null;
}

export function suggestFirstKnockoutRound(
  groups: SuggestionGroup[],
  perGroup: number = DEFAULT_QUALIFIERS_PER_GROUP,
): BracketSuggestion {
  const problem = blocker(groups, perGroup);
  if (problem) return { pairs: [], problem };

  const pairs: SuggestedPair[] = pairQualifierSlots(groups.length, groups.length * perGroup).map(
    (pair) => ({
      home: slot(groups[pair.home.groupIndex], pair.home.position),
      away: slot(groups[pair.away.groupIndex], pair.away.position),
    }),
  );

  return { pairs, problem: warning(groups, perGroup) };
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
