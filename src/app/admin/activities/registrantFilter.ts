import { activityRegistrants as texts } from "@/lib/texts";
import type { Registration } from "./activityTypes";

export interface TeamSelection {
  teamIds: string[];
  noTeam: boolean;
}

export const NOTHING_PICKED: TeamSelection = { teamIds: [], noTeam: false };

export function hasTeamFilter(selection: TeamSelection): boolean {
  return selection.teamIds.length > 0 || selection.noTeam;
}

export function toggleTeam(selection: TeamSelection, teamId: string): TeamSelection {
  const held = selection.teamIds.includes(teamId);
  return {
    ...selection,
    teamIds: held
      ? selection.teamIds.filter((id) => id !== teamId)
      : [...selection.teamIds, teamId],
  };
}

export function toggleNoTeam(selection: TeamSelection): TeamSelection {
  return { ...selection, noTeam: !selection.noTeam };
}

export function inTeam(registration: Registration, selection: TeamSelection): boolean {
  if (!hasTeamFilter(selection)) return true;
  if (registration.team === null) return selection.noTeam;
  return selection.teamIds.includes(registration.team.id);
}

export function pickedLabels(
  selection: TeamSelection,
  teams: { id: string; name: string }[],
): string[] {
  const named = teams.filter((team) => selection.teamIds.includes(team.id)).map((t) => t.name);
  return selection.noTeam ? [...named, texts.noTeam] : named;
}

export function teamFilterSummary(
  selection: TeamSelection,
  teams: { id: string; name: string }[],
): string {
  const labels = pickedLabels(selection, teams);
  if (labels.length === 0) return texts.allTeams;
  if (labels.length <= 2) return labels.join(texts.pickedSeparator);
  return `${labels.slice(0, 2).join(texts.pickedSeparator)} ${texts.andMoreTeams(labels.length - 2)}`;
}
