export interface SquadEntry {
  id: string;
}

export function captainFirst<T extends SquadEntry>(players: T[], captainId: string | null): T[] {
  if (!captainId) return players;
  const captain = players.filter((player) => player.id === captainId);
  if (captain.length === 0) return players;
  return [...captain, ...players.filter((player) => player.id !== captainId)];
}

export function isCaptain(playerId: string, captainId: string | null): boolean {
  return !!captainId && playerId === captainId;
}
