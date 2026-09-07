import { membershipState, type StatefulMembership } from "./membershipState";

export interface HomeCounts {
  pendingMembers: number;
  pendingRegistrations: number;
  pendingPayments: number;
}

export function membershipStanding(members: StatefulMembership[], year: number) {
  const states = members.map((member) => membershipState(member, year));
  const current = states.filter((state) => state === "UP_TO_DATE").length;
  const former = states.filter((state) => state === "BEHIND").length;

  return { current, active: current + former, former };
}

export function needsHandling(counts: HomeCounts): number {
  return counts.pendingMembers + counts.pendingRegistrations + counts.pendingPayments;
}

export function netMoney(revenue: number, spending: number): number {
  return revenue - spending;
}
