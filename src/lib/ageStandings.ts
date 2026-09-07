import { ageStandings } from "@/lib/texts";

export interface AgeStanding {
  rank: number;
  name: string;
  members: number;
  users: number;
  total: number;
  rate: number;
  userRate: number;
}

export type AgeSortKey = "rate" | "members" | "userRate" | "users" | "total";

export const DEFAULT_AGE_SORT: AgeSortKey = "rate";

export const AGE_SORTS: { key: AgeSortKey; label: string }[] = [
  { key: "rate", label: ageStandings.sorts.rate },
  { key: "members", label: ageStandings.sorts.members },
  { key: "userRate", label: ageStandings.sorts.userRate },
  { key: "users", label: ageStandings.sorts.users },
  { key: "total", label: ageStandings.sorts.total },
];

export function membershipRate(members: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((members / total) * 100));
}

export function sortStandings<T extends Omit<AgeStanding, "rank">>(
  rows: T[],
  key: AgeSortKey = DEFAULT_AGE_SORT,
): (T & { rank: number })[] {
  return [...rows]
    .sort((a, b) => b[key] - a[key] || a.name.localeCompare(b.name, "ar"))
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

function holdsAnybody(row: { members: number; users: number }): boolean {
  return row.members > 0 || row.users > 0;
}

export function rankAgeGroups(
  groups: { name: string; totalCount: number }[],
  memberCounts: Map<string, number>,
  userCounts: Map<string, number> = new Map(),
  { key = DEFAULT_AGE_SORT, keepEmpty = false }: { key?: AgeSortKey; keepEmpty?: boolean } = {},
): AgeStanding[] {
  const rows = groups.map((g) => {
    const members = memberCounts.get(g.name) ?? 0;
    const users = userCounts.get(g.name) ?? 0;
    return {
      name: g.name,
      members,
      users,
      total: g.totalCount,
      rate: membershipRate(members, g.totalCount),
      userRate: membershipRate(users, g.totalCount),
    };
  });

  return sortStandings(keepEmpty ? rows : rows.filter(holdsAnybody), key);
}
