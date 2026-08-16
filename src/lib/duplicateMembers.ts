import type { ReviewStatus } from "@prisma/client";

// An account holds one membership. Accounts that predate that rule hold
// several, and this decides which one is the membership and what becomes of
// the others.
//
// Keeping order: an approved membership beats a pending one beats a rejected
// one; then whichever carries records (a card, a registration, a team, money)
// beats one that carries none; then the most recent, which is the form the
// member last corrected.
//
// A loser that carries nothing is deleted. A loser that carries something is
// detached instead — userId dropped, row left alone — because every relation
// cascades on delete, so removing it would take an activity registration or a
// donation with it. Detached is a state the model already has: the admin-added
// member whose account comes later.
export type DuplicateMember = {
  id: string;
  status: ReviewStatus;
  createdAt: Date;
  memberNumber: string | null;
  registrations: number;
  teamMemberships: number;
  donations: number;
  matchGoals: number;
  matchBookings: number;
  mvpCandidacies: number;
  motmMatches: number;
};

export type AccountPlan<T extends DuplicateMember> = {
  keep: T;
  remove: T[];
  detach: T[];
};

const STATUS_RANK: Record<ReviewStatus, number> = { ACTIVE: 0, PENDING: 1, REJECTED: 2 };

export function carriesRecords(member: DuplicateMember): boolean {
  return (
    member.memberNumber !== null ||
    member.registrations > 0 ||
    member.teamMemberships > 0 ||
    member.donations > 0 ||
    member.matchGoals > 0 ||
    member.matchBookings > 0 ||
    member.mvpCandidacies > 0 ||
    member.motmMatches > 0
  );
}

export function compareMembers(a: DuplicateMember, b: DuplicateMember): number {
  const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
  if (byStatus !== 0) return byStatus;
  const byRecords = Number(carriesRecords(b)) - Number(carriesRecords(a));
  if (byRecords !== 0) return byRecords;
  return b.createdAt.getTime() - a.createdAt.getTime();
}

export function planAccount<T extends DuplicateMember>(members: T[]): AccountPlan<T> | null {
  if (members.length < 2) return null;
  const [keep, ...losers] = [...members].sort(compareMembers);
  return {
    keep,
    remove: losers.filter((m) => !carriesRecords(m)),
    detach: losers.filter((m) => carriesRecords(m)),
  };
}
