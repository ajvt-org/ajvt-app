import { publicTournament } from "./texts/publicTournament";

export interface FixtureSide {
  name: string;
}

export interface FixtureTeams {
  firstTeam: FixtureSide | null;
  secondTeam: FixtureSide | null;
}

export function teamName(team: FixtureSide | null): string {
  return team ? team.name : publicTournament.teamDecidedLater;
}

export function fixtureName(match: FixtureTeams): string {
  return `${teamName(match.firstTeam)} × ${teamName(match.secondTeam)}`;
}

export function bothTeamsKnown<T extends FixtureTeams>(
  match: T,
): match is T & {
  firstTeam: NonNullable<T["firstTeam"]>;
  secondTeam: NonNullable<T["secondTeam"]>;
} {
  return match.firstTeam !== null && match.secondTeam !== null;
}
