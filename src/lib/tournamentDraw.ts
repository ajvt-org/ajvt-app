export interface DrawnGroup<T> {
  index: number;
  teams: T[];
}

export function dealIntoGroups<T>(teams: T[], groupCount: number): DrawnGroup<T>[] {
  const groups: DrawnGroup<T>[] = Array.from({ length: groupCount }, (_, index) => ({
    index,
    teams: [],
  }));
  teams.forEach((team, i) => groups[i % groupCount].teams.push(team));
  return groups;
}

export function groupsAreEven<T>(groups: DrawnGroup<T>[]): boolean {
  if (groups.length === 0) return false;
  return groups.every((g) => g.teams.length === groups[0].teams.length);
}

export function holdsEveryTeamOnce<T extends { id: string }>(
  groups: DrawnGroup<T>[],
  teams: T[],
): boolean {
  const placed = groups.flatMap((g) => g.teams.map((t) => t.id));
  return placed.length === teams.length && new Set(placed).size === teams.length;
}

export function swapTeams<T extends { id: string }>(
  groups: DrawnGroup<T>[],
  oneId: string,
  otherId: string,
): DrawnGroup<T>[] {
  const one = locate(groups, oneId);
  const other = locate(groups, otherId);
  if (!one || !other) return groups;
  if (one.group === other.group) return groups;

  return groups.map((group, index) => {
    if (index !== one.group && index !== other.group) return group;
    const takes = index === one.group ? other : one;
    const gives = index === one.group ? one : other;
    return {
      ...group,
      teams: group.teams.map((team) => (team.id === gives.team.id ? takes.team : team)),
    };
  });
}

function locate<T extends { id: string }>(
  groups: DrawnGroup<T>[],
  teamId: string,
): { group: number; team: T } | null {
  for (const group of groups) {
    const team = group.teams.find((t) => t.id === teamId);
    if (team) return { group: group.index, team };
  }
  return null;
}
