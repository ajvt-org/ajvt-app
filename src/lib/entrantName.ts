import { displayTeamName } from "./teamSize";

export interface EntrantTeam {
  id: string;
  name: string;
  autoNamed: boolean;
  members: { member: { fullName: string; photo?: string | null } }[];
}

export interface EntrantIdentity {
  name: string;
  photo: string | null;
}

export function entrantIdentities(
  teams: EntrantTeam[],
  teamSize: number | null,
): Map<string, EntrantIdentity> {
  return new Map(
    teams.map((team) => [
      team.id,
      {
        name: displayTeamName(
          {
            id: team.id,
            name: team.name,
            autoNamed: team.autoNamed,
            memberNames: team.members.map((m) => m.member.fullName),
          },
          teamSize,
        ),
        photo: teamSize === 1 ? (team.members[0]?.member.photo ?? null) : null,
      },
    ]),
  );
}

export function namedEntrant<T extends { id: string; name: string } | null>(
  side: T,
  identities: Map<string, EntrantIdentity>,
): T extends null ? null : T & { photo: string | null } {
  if (!side) return side as never;
  const identity = identities.get(side.id);
  return { ...side, name: identity?.name ?? side.name, photo: identity?.photo ?? null } as never;
}
