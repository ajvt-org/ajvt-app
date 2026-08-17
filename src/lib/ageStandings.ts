export interface AgeStanding {
  rank: number;
  name: string;
  members: number;
  users: number;
  total: number;
  rate: number;
  userRate: number;
}

export const DEFAULT_AGE_TOTAL = 30;

export type AgeSortKey = "rate" | "members" | "userRate" | "users" | "total";

export const DEFAULT_AGE_SORT: AgeSortKey = "rate";

export const AGE_SORTS: { key: AgeSortKey; label: string }[] = [
  { key: "rate", label: "نسبة المنتسبين" },
  { key: "members", label: "عدد المنتسبين" },
  { key: "userRate", label: "نسبة الحسابات" },
  { key: "users", label: "عدد الحسابات" },
  { key: "total", label: "العدد الإجمالي" },
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

export function rankAgeGroups(
  groups: { name: string; totalCount: number }[],
  memberCounts: Map<string, number>,
  userCounts: Map<string, number> = new Map(),
  key: AgeSortKey = DEFAULT_AGE_SORT,
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

  return sortStandings(rows, key);
}
