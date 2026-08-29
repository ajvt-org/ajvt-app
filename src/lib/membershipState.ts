export type MembershipState =
  "NO_PAYMENT" | "AWAITING_REVIEW" | "REFUSED" | "UP_TO_DATE" | "BEHIND";

export interface StatefulMembership {
  status: "PENDING" | "ACTIVE" | "REJECTED";
  membershipYear: number;
}

export function membershipState(
  member: StatefulMembership | null | undefined,
  currentYear: number,
): MembershipState {
  if (!member) return "NO_PAYMENT";
  if (member.status === "PENDING") return "AWAITING_REVIEW";
  if (member.status === "REJECTED") return "REFUSED";

  return member.membershipYear >= currentYear ? "UP_TO_DATE" : "BEHIND";
}

export function needsAttention(state: MembershipState): boolean {
  return state !== "UP_TO_DATE";
}
