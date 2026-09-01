import { activityRegistrants as texts } from "@/lib/texts";
import type { FilterOption } from "./FilterChips";
import type { Registration } from "./activityTypes";

export const ALL_TEAMS = "";
export const NO_TEAM = "none";

export function teamFilterOptions(teams: { id: string; name: string }[]): FilterOption[] {
  return [
    { value: ALL_TEAMS, label: texts.allTeams },
    ...teams.map((team) => ({ value: team.id, label: team.name })),
    { value: NO_TEAM, label: texts.noTeam },
  ];
}

export function inTeam(registration: Registration, team: string): boolean {
  if (team === ALL_TEAMS) return true;
  if (team === NO_TEAM) return registration.team === null;
  return registration.team?.id === team;
}
