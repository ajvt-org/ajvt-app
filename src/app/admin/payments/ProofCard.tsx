"use client";

import { useEffect, useRef } from "react";
import Money from "@/components/Money";
import IconLabel from "@/components/IconLabel";
import ProofReuseWarning from "@/components/admin/ProofReuseWarning";
import type { FinanceTag } from "@/components/admin/FinanceTagChips";
import { paymentCard, PROOF_STATUS_LABEL } from "@/lib/texts";
import { linkedAccount } from "@/lib/linkedAccount";
import { donorNamesShown } from "@/lib/donorNamesShown";
import DonationProofCard from "./DonationProofCard";
import MembershipProofCard from "./MembershipProofCard";
import PaymentFacts from "./PaymentFacts";
import PaymentHistory from "./PaymentHistory";
import ProofThumb from "./ProofThumb";
import { REUSE_KIND } from "./proofKinds";
import type { DestinationOption } from "@/lib/moneyDestination";
import { STATUS_CLASS, type MemberOption, type Proof } from "./paymentTypes";

export default function ProofCard({
  proof,
  focused,
  members,
  destinations,
  financeTags,
  busy,
  onReview,
  onDelete,
  onLink,
  onPatch,
  onMembershipChanged,
}: {
  proof: Proof;
  focused?: boolean;
  members: MemberOption[];
  destinations: DestinationOption[];
  financeTags: FinanceTag[];
  busy: boolean;
  onReview: (status: "ACTIVE" | "REJECTED") => void;
  onDelete: () => void;
  onLink: (userId: string | null) => void;
  onPatch: (changes: Partial<Proof>) => void;
  onMembershipChanged: () => void;
}) {
  const card = useRef<HTMLDivElement>(null);
  const isDonation = proof.kind === "DONATION";
  const linkedMember = linkedAccount(members, proof.userId);
  const reuseKind = REUSE_KIND[proof.kind];
  const names = donorNamesShown(proof);

  useEffect(() => {
    if (focused) card.current?.scrollIntoView({ block: "center" });
  }, [focused]);

  return (
    <div
      ref={card}
      className="card p-3 flex flex-col gap-2"
      style={focused ? { outline: "2px solid var(--mint-600)", outlineOffset: "2px" } : undefined}
    >
      <div className="flex items-start gap-3">
        <ProofThumb proof={proof.proof} alt={proof.memberName} />

        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-bold text-sm min-w-0" style={{ color: "var(--text-main)" }}>
                {names.name}
              </p>
              <span className={`badge ${STATUS_CLASS[proof.status] || "badge-pending"}`}>
                {PROOF_STATUS_LABEL[proof.status] || proof.status}
              </span>
              {isDonation && proof.userId && (
                <span className="badge badge-active">
                  <IconLabel name="link" size={11}>
                    {paymentCard.linked}
                  </IconLabel>
                </span>
              )}
              {isDonation && proof.anonymous && (
                <span className="badge badge-pending">
                  <IconLabel name="ban" size={11}>
                    {paymentCard.hiddenOnBoard}
                  </IconLabel>
                </span>
              )}
            </div>
            {isDonation && proof.amount != null && (
              <p className="font-bold text-sm shrink-0" style={{ color: "var(--mint-700)" }}>
                <Money value={proof.amount} />
              </p>
            )}
          </div>

          <PaymentFacts proof={proof} linkedMember={linkedMember} />
        </div>
      </div>

      {reuseKind && <ProofReuseWarning filename={proof.proof} kind={reuseKind} id={proof.id} />}

      {isDonation && (
        <DonationProofCard
          proof={proof}
          members={members}
          linkedMember={linkedMember}
          destinations={destinations}
          financeTags={financeTags}
          busy={busy}
          onReview={onReview}
          onDelete={onDelete}
          onLink={onLink}
          onPatch={onPatch}
        />
      )}

      {proof.kind === "MEMBERSHIP" && (
        <MembershipProofCard proof={proof} onChanged={onMembershipChanged} />
      )}

      <PaymentHistory kind={proof.kind} id={proof.id} />
    </div>
  );
}
