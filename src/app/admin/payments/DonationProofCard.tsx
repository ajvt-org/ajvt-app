"use client";

import { useState } from "react";
import type { FinanceTag } from "@/components/admin/FinanceTagChips";
import type { DestinationOption } from "@/lib/moneyDestination";
import DonationActions from "./DonationActions";
import DonationEditForm from "./DonationEditForm";
import DonationTags from "./DonationTags";
import LinkMemberPanel from "./LinkMemberPanel";
import type { MemberOption, Proof } from "./paymentTypes";

export default function DonationProofCard({
  proof,
  members,
  linkedMember,
  destinations,
  financeTags,
  busy,
  onReview,
  onDelete,
  onLink,
  onPatch,
}: {
  proof: Proof;
  members: MemberOption[];
  linkedMember?: MemberOption;
  destinations: DestinationOption[];
  financeTags: FinanceTag[];
  busy: boolean;
  onReview: (status: "ACTIVE" | "REJECTED") => void;
  onDelete: () => void;
  onLink: (userId: string | null) => void;
  onPatch: (changes: Partial<Proof>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [linking, setLinking] = useState(false);

  return (
    <>
      <DonationTags
        donationId={proof.id}
        tags={proof.tags ?? []}
        allTags={financeTags}
        onSaved={(tags) => onPatch({ tags })}
      />

      <DonationActions
        proof={proof}
        busy={busy}
        onReview={onReview}
        onEdit={() => setEditing(true)}
        onDelete={onDelete}
        onLink={() => setLinking((p) => !p)}
        onUnlink={() => onLink(null)}
      />

      {editing && (
        <DonationEditForm
          proof={proof}
          destinations={destinations}
          linkedMember={linkedMember}
          onCancel={() => setEditing(false)}
          onRelink={() => setLinking(true)}
          onSaved={(changes) => {
            onPatch(changes);
            setEditing(false);
          }}
        />
      )}

      {linking && (
        <LinkMemberPanel
          members={members}
          busy={busy}
          onPick={(userId) => {
            onLink(userId);
            setLinking(false);
          }}
        />
      )}
    </>
  );
}
