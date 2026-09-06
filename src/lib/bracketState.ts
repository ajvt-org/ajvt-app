import { isBye } from "./bracketDraw";

export interface BracketFixture {
  bracketRound: number;
  firstTeam: unknown;
  secondTeam: unknown;
  status: string;
}

export function bracketUntouched(bracketMatches: BracketFixture[]): boolean {
  return (
    bracketMatches.length > 0 && bracketMatches.every((m) => m.status === "SCHEDULED" || isBye(m))
  );
}

export function firstRoundIsWaiting(bracketMatches: BracketFixture[]): boolean {
  if (!bracketUntouched(bracketMatches)) return false;
  const firstRound = bracketMatches.filter((m) => m.bracketRound === 1);
  return (
    firstRound.length > 0 && firstRound.every((m) => m.firstTeam === null && m.secondTeam === null)
  );
}
