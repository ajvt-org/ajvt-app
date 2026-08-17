export interface TeamRoster {
  id: string;
  name: string;
  autoNamed: boolean;
  memberNames: string[];
}

export function teamIsFull(currentCount: number, teamSize: number | null): boolean {
  return teamSize !== null && currentCount >= teamSize;
}

export function incompleteTeams(teams: TeamRoster[], teamSize: number | null): TeamRoster[] {
  if (teamSize === null) return [];
  return teams.filter((t) => t.memberNames.length !== teamSize);
}

export function displayTeamName(team: TeamRoster, teamSize: number | null): string {
  if (teamSize === null) return team.name;
  if (!team.autoNamed && team.name.trim()) return team.name;
  if (team.memberNames.length === 0) return team.name;
  return team.memberNames.join(" و ");
}

export function placeholderTeamName(index: number): string {
  return `فريق ${index}`;
}

export function normalizeTeamSize(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 20) return null;
  return n;
}
