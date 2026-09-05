import { displayTeamName } from "./teamSize";

export interface EntrantTeam {
  id: string;
  name: string;
  autoNamed: boolean;
  members: { member: { fullName: string } }[];
}

export function entrantNames(teams: EntrantTeam[], teamSize: number | null): Map<string, string> {
  return new Map(
    teams.map((team) => [
      team.id,
      displayTeamName(
        {
          id: team.id,
          name: team.name,
          autoNamed: team.autoNamed,
          memberNames: team.members.map((m) => m.member.fullName),
        },
        teamSize,
      ),
    ]),
  );
}

export function namedEntrant<T extends { id: string; name: string } | null>(
  side: T,
  names: Map<string, string>,
): T {
  if (!side) return side;
  return { ...side, name: names.get(side.id) ?? side.name };
}
