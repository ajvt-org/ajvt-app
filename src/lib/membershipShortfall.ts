import { endingRefusal, type EndableMembership } from "./membershipEnding";
import { AMOUNT_BELOW_FEE } from "./texts/membershipEnding";

export type AmountConsequence = "endable" | "restorable" | null;

export interface CorrectedMembership extends EndableMembership {
  endedReason: string | null;
}

export function amountConsequence(
  amount: number,
  feeApplied: number,
  membership: CorrectedMembership,
): AmountConsequence {
  if (amount < feeApplied) {
    return endingRefusal(membership) === null ? "endable" : null;
  }
  if (membership.endedAt && membership.endedReason === AMOUNT_BELOW_FEE) return "restorable";
  return null;
}
