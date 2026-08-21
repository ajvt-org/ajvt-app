export interface StandingMember {
  status: string;
  membershipYear: number;
  paidAmount: number | null;
}

export interface HomeCounts {
  pendingMembers: number;
  pendingRegistrations: number;
  pendingPayments: number;
}

export function membershipStanding(members: StandingMember[], year: number, fee: number) {
  const active = members.filter((m) => m.status === "ACTIVE");
  const paid = active.filter((m) => m.membershipYear === year && (m.paidAmount ?? 0) >= fee);
  return { paid: paid.length, active: active.length, behind: active.length - paid.length };
}

export function needsHandling(counts: HomeCounts): number {
  return counts.pendingMembers + counts.pendingRegistrations + counts.pendingPayments;
}

export function netMoney(revenue: number, spending: number): number {
  return revenue - spending;
}
