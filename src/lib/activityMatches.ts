import type { Prisma } from "@prisma/client";
import { tournamentStage, type TournamentStage } from "./tournamentStage";

const STILL_TO_PLAY = {
  status: "SCHEDULED",
  forfeitWinnerTeamId: null,
} satisfies Prisma.MatchWhereInput;

export const STANDING_MATCH_SELECT = {
  bracketRound: true,
  status: true,
  forfeitWinnerTeamId: true,
} satisfies Prisma.MatchSelect;

export interface StandingMatch {
  bracketRound: number | null;
  status: string;
  forfeitWinnerTeamId: string | null;
}

export function stillToPlay(match: StandingMatch): boolean {
  return (
    match.status === STILL_TO_PLAY.status &&
    match.forfeitWinnerTeamId === STILL_TO_PLAY.forfeitWinnerTeamId
  );
}

export interface MatchStanding {
  unplayedMatches: number;
  awaitingStage: TournamentStage | null;
}

export function matchStanding(matches: StandingMatch[], isTournament: boolean): MatchStanding {
  const flagged = matches.map((m) => ({ bracketRound: m.bracketRound, unplayed: stillToPlay(m) }));
  return {
    unplayedMatches: flagged.filter((m) => m.unplayed).length,
    awaitingStage: isTournament ? tournamentStage(flagged) : null,
  };
}
