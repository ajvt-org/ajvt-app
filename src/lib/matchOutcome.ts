export interface ScoredMatch {
  status: "SCHEDULED" | "PLAYED";
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  forfeitWinnerTeamId: string | null;
}

export interface MatchOutcome {
  home: number;
  away: number;
  penalties: { home: number; away: number } | null;
  forfeit: boolean;
}

export function matchOutcome(match: ScoredMatch): MatchOutcome | null {
  if (match.status !== "PLAYED") return null;
  if (match.homeScore === null || match.awayScore === null) return null;
  const forfeit = match.forfeitWinnerTeamId !== null;
  return {
    home: match.homeScore,
    away: match.awayScore,
    penalties:
      !forfeit && match.homePenalties !== null && match.awayPenalties !== null
        ? { home: match.homePenalties, away: match.awayPenalties }
        : null,
    forfeit,
  };
}
