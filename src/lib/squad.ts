export interface SquadEntry {
  id: string;
}

export interface TeamEntry {
  members: { member: SquadEntry }[];
}

function pickedFirst<T>(items: T[], picked: (item: T) => boolean): T[] {
  const front = items.filter(picked);
  if (front.length === 0) return items;
  return [...front, ...items.filter((item) => !picked(item))];
}

export function captainFirst<T extends SquadEntry>(players: T[], captainId: string | null): T[] {
  if (!captainId) return players;
  return pickedFirst(players, (player) => isCaptain(player.id, captainId));
}

export function isCaptain(playerId: string, captainId: string | null): boolean {
  return !!captainId && playerId === captainId;
}

export function isViewer(playerId: string, viewerId: string | null): boolean {
  return !!viewerId && playerId === viewerId;
}

export function holdsViewer(team: TeamEntry, viewerId: string | null): boolean {
  return team.members.some((entry) => isViewer(entry.member.id, viewerId));
}

export function viewerTeamId<T extends TeamEntry & { id: string }>(
  teams: T[],
  viewerId: string | null,
): string | null {
  return teams.find((team) => holdsViewer(team, viewerId))?.id ?? null;
}

export function viewerTeamFirst<T extends TeamEntry>(teams: T[], viewerId: string | null): T[] {
  if (!viewerId) return teams;
  return pickedFirst(teams, (team) => holdsViewer(team, viewerId));
}
