export type MembershipState =
  "NOT_A_MEMBER" | "APPLIED" | "APPLICATION_REFUSED" | "UP_TO_DATE" | "BEHIND" | "ENDED";

export interface StatefulMembership {
  status: "PENDING" | "ACTIVE" | "REJECTED";
  membershipYear: number;
  endedAt: Date | string | null;
}

export function membershipState(
  member: StatefulMembership | null | undefined,
  currentYear: number,
): MembershipState {
  if (!member) return "NOT_A_MEMBER";
  if (member.status === "PENDING") return "APPLIED";
  if (member.status === "REJECTED") return "APPLICATION_REFUSED";
  if (member.endedAt) return "ENDED";

  return member.membershipYear >= currentYear ? "UP_TO_DATE" : "BEHIND";
}

export function needsAttention(state: MembershipState): boolean {
  return state !== "UP_TO_DATE";
}
