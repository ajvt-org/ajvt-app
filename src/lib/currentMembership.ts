import type { StatefulMembership } from "./membershipState";

export interface MembershipOfAYear {
  year: number;
}

export interface AccountMembership extends MembershipOfAYear {
  userId: string;
}

export function latestMembership<T extends MembershipOfAYear>(rows: T[]): T | null {
  return rows.reduce<T | null>(
    (latest, row) => (latest === null || row.year > latest.year ? row : latest),
    null,
  );
}

export function latestByAccount<T extends AccountMembership>(rows: T[]): Map<string, T> {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const held = latest.get(row.userId);
    if (!held || row.year > held.year) latest.set(row.userId, row);
  }
  return latest;
}

export function asMembershipState(
  row: (MembershipOfAYear & { status: StatefulMembership["status"] }) | null,
): StatefulMembership | null {
  return row === null ? null : { status: row.status, membershipYear: row.year };
}
