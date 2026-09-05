export interface TeamRoster {
  id: string;
  name: string;
  autoNamed: boolean;
  memberNames: string[];
}

export interface SquadSize {
  min: number | null;
  max: number | null;
}

export const OPEN_SQUAD: SquadSize = { min: null, max: null };

export function squadOf(activity: {
  minTeamSize: number | null;
  maxTeamSize: number | null;
}): SquadSize {
  return { min: activity.minTeamSize, max: activity.maxTeamSize };
}

export function fixedSquad(squad: SquadSize): number | null {
  return squad.min !== null && squad.min === squad.max ? squad.min : null;
}

export function isSinglesSquad(squad: SquadSize): boolean {
  return fixedSquad(squad) === 1;
}

export function squadIsSet(squad: SquadSize): boolean {
  return squad.min !== null || squad.max !== null;
}

export function teamIsFull(currentCount: number, squad: SquadSize): boolean {
  return squad.max !== null && currentCount >= squad.max;
}

export function rosterFault(count: number, squad: SquadSize): "short" | "over" | null {
  if (squad.min !== null && count < squad.min) return "short";
  if (squad.max !== null && count > squad.max) return "over";
  return null;
}

export function incompleteTeams(teams: TeamRoster[], squad: SquadSize): TeamRoster[] {
  if (!squadIsSet(squad)) return [];
  return teams.filter((t) => rosterFault(t.memberNames.length, squad) !== null);
}

export function displayTeamName(team: TeamRoster, squad: SquadSize): string {
  if (!squadIsSet(squad)) return team.name;
  if (!team.autoNamed && team.name.trim()) return team.name;
  if (team.memberNames.length === 0) return team.name;
  return team.memberNames.join(" و ");
}

export function squadLabel(squad: SquadSize): string | null {
  const fixed = fixedSquad(squad);
  if (fixed !== null) return String(fixed);
  if (squad.min !== null && squad.max !== null) return `${squad.min}-${squad.max}`;
  if (squad.min !== null) return `${squad.min}+`;
  if (squad.max !== null) return String(squad.max);
  return null;
}

export function placeholderTeamName(index: number): string {
  return `فريق ${index}`;
}

export function normalizeTeamSize(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 40) return null;
  return n;
}
