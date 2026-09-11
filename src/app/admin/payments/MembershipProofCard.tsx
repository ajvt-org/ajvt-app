"use client";

import MembershipActions from "./MembershipActions";
import type { Proof } from "./paymentTypes";

export default function MembershipProofCard({
  proof,
  onChanged,
}: {
  proof: Proof;
  onChanged: () => void;
}) {
  if (!proof.userId) return null;

  return (
    <MembershipActions
      userId={proof.userId}
      memberName={proof.memberName}
      proof={proof.proof}
      status={proof.status}
      payment={proof}
      onChanged={onChanged}
    />
  );
}
