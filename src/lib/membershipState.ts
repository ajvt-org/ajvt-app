// Where an account stands with the association, in one word.
//
// Everything on /home that talks to the member reads from this: whether to
// ask for the fee, to wait, to point at a refusal, or to say nothing at all.
// It is a pure function of the membership row and the year the association
// is currently collecting for, so the answer cannot differ between screens.
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
  // A year ahead is not behind. The association can open next year's
  // collection early, and a member who paid into it is as paid up as it gets.
  return member.membershipYear >= currentYear ? "UP_TO_DATE" : "BEHIND";
}

// Nothing to say to someone who is paid up for the year. Every other state
// is either an action for them or news they have not been given.
export function needsAttention(state: MembershipState): boolean {
  return state !== "UP_TO_DATE";
}
