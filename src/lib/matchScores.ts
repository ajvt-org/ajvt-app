import { scoreFromGoals } from "./matchInput";

export type PeriodGoal = { teamId: string; period: "REGULAR" | "EXTRA_TIME" };
export type SidedKick = { teamId: string };
export type Score = { home: number; away: number };

export function regularScore(goals: PeriodGoal[], homeTeamId: string): Score {
  return scoreFromGoals(
    goals.filter((g) => g.period === "REGULAR"),
    homeTeamId,
  );
}

export function playedScore(goals: PeriodGoal[], homeTeamId: string): Score {
  return scoreFromGoals(goals, homeTeamId);
}

export function level(score: Score): boolean {
  return score.home === score.away;
}

export function hasExtraTime(goals: PeriodGoal[]): boolean {
  return goals.some((g) => g.period === "EXTRA_TIME");
}

export function extraTimeAllowed(
  isKnockout: boolean,
  goals: PeriodGoal[],
  homeTeamId: string,
): boolean {
  return isKnockout && level(regularScore(goals, homeTeamId));
}

export function kicksAllowed(
  isKnockout: boolean,
  goals: PeriodGoal[],
  homeTeamId: string,
): boolean {
  return isKnockout && level(playedScore(goals, homeTeamId));
}

export function kicksAlternate(kicks: SidedKick[]): boolean {
  return kicks.every((kick, i) => i === 0 || kick.teamId !== kicks[i - 1].teamId);
}

export function nextKickTeamId(
  kicks: SidedKick[],
  firstTeamId: string,
  homeTeamId: string,
  awayTeamId: string,
): string {
  const last = kicks.at(-1);
  if (!last) return firstTeamId;
  return last.teamId === homeTeamId ? awayTeamId : homeTeamId;
}
