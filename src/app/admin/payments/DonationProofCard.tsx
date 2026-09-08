"use client";

import { useState } from "react";
import Notice from "@/components/Notice";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import type { FinanceTag } from "@/components/admin/FinanceTagChips";
import { donationActions } from "@/lib/texts";
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
  error,
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
  error: string;
  onReview: (status: "ACTIVE" | "REJECTED") => void;
  onDelete: () => void;
  onLink: (userId: string | null) => void;
  onPatch: (changes: Partial<Proof>) => void;
}) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [confirming, setConfirming] = useState(false);

  const toggle = (next: Panel) => setPanel((p) => (p === next ? null : next));

  return (
    <>
      <DonationActions
        proof={proof}
        busy={busy}
        onReview={onReview}
        onEdit={() => toggle("edit")}
        onTag={() => toggle("tags")}
        onDelete={() => setConfirming(true)}
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

      {error && <Notice tone="error">{error}</Notice>}

      {confirming && (
        <ConfirmDialog
          title={donationActions.remove}
          message={donationActions.confirmRemove}
          confirmLabel={donationActions.remove}
          danger
          loading={busy}
          onConfirm={() => {
            setConfirming(false);
            onDelete();
          }}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}
