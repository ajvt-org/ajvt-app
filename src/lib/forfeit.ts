export const FORFEIT_AWARD = 3;

export function forfeitLoserTeamId(
  winnerTeamId: string,
  homeTeamId: string,
  awayTeamId: string,
): string {
  return winnerTeamId === homeTeamId ? awayTeamId : homeTeamId;
}

export function forfeitScore(
  scored: { home: number; away: number },
  winnerTeamId: string,
  homeTeamId: string,
): { home: number; away: number } {
  const winnerIsHome = winnerTeamId === homeTeamId;
  const awarded = Math.max(winnerIsHome ? scored.home : scored.away, FORFEIT_AWARD);
  return winnerIsHome ? { home: awarded, away: 0 } : { home: 0, away: awarded };
}

export function countsForScorers(
  goal: { teamId: string },
  forfeitWinnerTeamId: string | null | undefined,
): boolean {
  return !forfeitWinnerTeamId || goal.teamId === forfeitWinnerTeamId;
}
