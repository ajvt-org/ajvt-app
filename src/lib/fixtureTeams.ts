import { publicTournament } from "./texts/publicTournament";

export interface FixtureSide {
  name: string;
}

export interface FixtureTeams {
  homeTeam: FixtureSide | null;
  awayTeam: FixtureSide | null;
}

export function teamName(team: FixtureSide | null): string {
  return team ? team.name : publicTournament.teamDecidedLater;
}

export function fixtureName(match: FixtureTeams): string {
  return `${teamName(match.homeTeam)} × ${teamName(match.awayTeam)}`;
}

export function bothTeamsKnown<T extends FixtureTeams>(
  match: T,
): match is T & { homeTeam: NonNullable<T["homeTeam"]>; awayTeam: NonNullable<T["awayTeam"]> } {
  return match.homeTeam !== null && match.awayTeam !== null;
}
