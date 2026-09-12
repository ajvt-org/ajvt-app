"use client";

import VerbButton from "@/components/admin/VerbButton";
import EditRecordButton from "@/components/admin/EditRecordButton";
import { GRAVE, LEAD, RISKY, SAFE } from "@/components/admin/verbTones";
import { donationActions, donationEdit } from "@/lib/texts";
import PaymentActions from "./PaymentActions";
import type { Proof } from "./paymentTypes";

export default function DonationActions({
  proof,
  busy,
  onReview,
  onEdit,
  onTag,
  onDelete,
  onLink,
  onUnlink,
}: {
  proof: Proof;
  busy: boolean;
  onReview: (status: "ACTIVE" | "REJECTED") => void;
  onEdit: () => void;
  onTag: () => void;
  onDelete: () => void;
  onLink: () => void;
  onUnlink: () => void;
}) {
  return (
    <PaymentActions
      danger={
        <>
          {proof.userId && (
            <VerbButton
              icon="unlink"
              label={donationEdit.unlink}
              tone={RISKY}
              disabled={busy}
              onClick={onUnlink}
            />
          )}
          {proof.status === "ACTIVE" && (
            <VerbButton
              icon="ban"
              label={donationActions.revoke}
              tone={RISKY}
              disabled={busy}
              onClick={() => onReview("REJECTED")}
            />
          )}
          <VerbButton
            icon="trash"
            label={donationActions.remove}
            tone={GRAVE}
            disabled={busy}
            onClick={onDelete}
          />
        </>
      }
    >
      {proof.status === "PENDING" && (
        <>
          <VerbButton
            icon="check"
            label={donationActions.accept}
            tone={LEAD}
            disabled={busy}
            onClick={() => onReview("ACTIVE")}
          />
          <VerbButton
            icon="close"
            label={donationActions.refuse}
            tone={RISKY}
            disabled={busy}
            onClick={() => onReview("REJECTED")}
          />
        </>
      )}
      {proof.status === "REJECTED" && (
        <VerbButton
          icon="refresh"
          label={donationActions.restore}
          tone={LEAD}
          disabled={busy}
          onClick={() => onReview("ACTIVE")}
        />
      )}

      <EditRecordButton label={donationActions.edit} disabled={busy} onClick={onEdit} />
      <VerbButton
        icon="tag"
        label={donationActions.classify}
        tone={SAFE}
        disabled={busy}
        onClick={onTag}
      />
      <VerbButton
        icon="link"
        label={proof.userId ? donationEdit.changeLink : donationEdit.link}
        tone={SAFE}
        disabled={busy}
        onClick={onLink}
      />
    </PaymentActions>
  );
}
