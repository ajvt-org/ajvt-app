export interface StandingMember {
  status: string;
  membershipYear: number;
}

export interface HomeCounts {
  pendingMembers: number;
  pendingRegistrations: number;
  pendingPayments: number;
}

export function membershipStanding(members: StandingMember[], year: number) {
  const active = members.filter((m) => m.status === "ACTIVE");
  const current = active.filter((m) => m.membershipYear === year);
  return {
    current: current.length,
    active: active.length,
    former: active.length - current.length,
  };
}

export function needsHandling(counts: HomeCounts): number {
  return counts.pendingMembers + counts.pendingRegistrations + counts.pendingPayments;
}

export function netMoney(revenue: number, spending: number): number {
  return revenue - spending;
}
