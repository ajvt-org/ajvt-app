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

type StatedMembership = MembershipOfAYear & { status: StatefulMembership["status"] };

export function asMembershipState(row: StatedMembership): StatefulMembership;
export function asMembershipState(row: StatedMembership | null): StatefulMembership | null;
export function asMembershipState(row: StatedMembership | null): StatefulMembership | null {
  return row === null ? null : { status: row.status, membershipYear: row.year };
}

const REVIEW_ORDER = ["PENDING", "ACTIVE", "REJECTED"];

export function byReviewOrder<T extends { status: string; createdAt: Date }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      REVIEW_ORDER.indexOf(a.status) - REVIEW_ORDER.indexOf(b.status) ||
      b.createdAt.getTime() - a.createdAt.getTime(),
  );
}
