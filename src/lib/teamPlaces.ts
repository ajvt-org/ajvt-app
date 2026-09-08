export interface TeamPlace {
  id: string;
  userId: string;
  teamId: string;
  captain: boolean;
  appeared: boolean;
}

export interface SortedPlaces {
  remove: TeamPlace[];
  captains: TeamPlace[];
  appeared: TeamPlace[];
}

export function sortTeamPlaces(places: TeamPlace[]): SortedPlaces {
  return {
    remove: places.filter((place) => !place.captain && !place.appeared),
    captains: places.filter((place) => place.captain),
    appeared: places.filter((place) => place.appeared && !place.captain),
  };
}

export function teamsLeftEmpty(removing: TeamPlace[], sizes: Map<string, number>): string[] {
  const going = new Map<string, number>();
  for (const place of removing) going.set(place.teamId, (going.get(place.teamId) ?? 0) + 1);
  return [...going]
    .filter(([teamId, count]) => (sizes.get(teamId) ?? 0) - count === 0)
    .map(([teamId]) => teamId);
}
