"use client";

import { useState } from "react";
import type { FinanceTag } from "@/components/admin/FinanceTagChips";
import type { DestinationOption } from "@/lib/moneyDestination";
import DonationActions from "./DonationActions";
import DonationEditForm from "./DonationEditForm";
import DonationTags from "./DonationTags";
import LinkMemberPanel from "./LinkMemberPanel";
import type { MemberOption, Proof } from "./paymentTypes";

type Panel = "edit" | "link" | "tags";

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
  const [panel, setPanel] = useState<Panel | null>(null);

  const toggle = (next: Panel) => setPanel((p) => (p === next ? null : next));

  return (
    <>
      <DonationActions
        proof={proof}
        busy={busy}
        onReview={onReview}
        onEdit={() => toggle("edit")}
        onTag={() => toggle("tags")}
        onDelete={onDelete}
        onLink={() => toggle("link")}
        onUnlink={() => onLink(null)}
      />

      {panel === "tags" && (
        <DonationTags
          donationId={proof.id}
          tags={proof.tags ?? []}
          allTags={financeTags}
          onSaved={(tags) => {
            onPatch({ tags });
            setPanel(null);
          }}
          onClose={() => setPanel(null)}
        />
      )}

      {panel === "edit" && (
        <DonationEditForm
          proof={proof}
          destinations={destinations}
          linkedMember={linkedMember}
          onCancel={() => setPanel(null)}
          onRelink={() => setPanel("link")}
          onSaved={(changes) => {
            onPatch(changes);
            setPanel(null);
          }}
        />
      )}

      {panel === "link" && (
        <LinkMemberPanel
          members={members}
          busy={busy}
          onPick={(userId) => {
            onLink(userId);
            setPanel(null);
          }}
        />
      )}
    </>
  );
}
