export interface AgeStanding {
  rank: number;
  name: string;
  members: number;
  total: number;
  rate: number;
}

export const DEFAULT_AGE_TOTAL = 30;

export function membershipRate(members: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((members / total) * 100));
}

export function rankAgeGroups(
  groups: { name: string; totalCount: number }[],
  memberCounts: Map<string, number>,
): AgeStanding[] {
  return groups
    .map((g) => {
      const members = memberCounts.get(g.name) ?? 0;
      return {
        name: g.name,
        members,
        total: g.totalCount,
        rate: membershipRate(members, g.totalCount),
      };
    })
    .sort((a, b) => b.members - a.members || a.name.localeCompare(b.name, "ar"))
    .map((entry, i) => ({ rank: i + 1, ...entry }));
}
