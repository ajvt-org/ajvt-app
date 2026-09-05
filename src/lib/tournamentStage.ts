export type TournamentStage = { kind: "group" } | { kind: "knockout"; roundSize: number };

export interface StageMatch {
  bracketRound: number | null;
  unplayed: boolean;
}

export function tournamentStage(matches: StageMatch[]): TournamentStage | null {
  const rounds = matches.filter((m) => m.unplayed).map((m) => m.bracketRound);
  if (rounds.length === 0) return null;
  if (rounds.some((round) => round === null)) return { kind: "group" };
  const lowest = Math.min(...rounds.filter((round): round is number => round !== null));
  return { kind: "knockout", roundSize: matches.filter((m) => m.bracketRound === lowest).length };
}
