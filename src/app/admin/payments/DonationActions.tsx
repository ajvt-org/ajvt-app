"use client";

import IconLabel from "@/components/IconLabel";
import { donationActions, donationEdit } from "@/lib/texts";
import PaymentActions from "./PaymentActions";
import { DANGER, DANGER_OUTLINE, QUIET } from "./donationTones";
import type { Proof } from "./paymentTypes";

function Action({
  busy,
  tone,
  primary,
  onClick,
  children,
}: {
  busy: boolean;
  tone?: React.CSSProperties;
  primary?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`btn btn-sm font-bold${primary ? " btn-primary" : ""}`}
      style={tone}
    >
      {busy ? "..." : children}
    </button>
  );
}

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
          {proof.status === "ACTIVE" && (
            <Action busy={busy} tone={DANGER} onClick={() => onReview("REJECTED")}>
              <IconLabel name="ban">{donationActions.revoke}</IconLabel>
            </Action>
          )}
          <Action busy={busy} tone={DANGER_OUTLINE} onClick={onDelete}>
            <IconLabel name="trash">{donationActions.remove}</IconLabel>
          </Action>
        </>
      }
    >
      {proof.status === "PENDING" && (
        <>
          <Action busy={busy} primary onClick={() => onReview("ACTIVE")}>
            <IconLabel name="check">{donationActions.accept}</IconLabel>
          </Action>
          <Action busy={busy} tone={DANGER} onClick={() => onReview("REJECTED")}>
            <IconLabel name="close">{donationActions.refuse}</IconLabel>
          </Action>
        </>
      )}
      {proof.status === "REJECTED" && (
        <Action busy={busy} primary onClick={() => onReview("ACTIVE")}>
          <IconLabel name="refresh">{donationActions.restore}</IconLabel>
        </Action>
      )}

      <Action busy={busy} tone={QUIET} onClick={onEdit}>
        <IconLabel name="pencil">{donationActions.edit}</IconLabel>
      </Action>
      <Action busy={busy} tone={QUIET} onClick={onTag}>
        <IconLabel name="list">{donationActions.classify}</IconLabel>
      </Action>
      <Action busy={busy} tone={QUIET} onClick={onLink}>
        <IconLabel name="link">
          {proof.userId ? donationEdit.changeLink : donationEdit.link}
        </IconLabel>
      </Action>
      {proof.userId && (
        <Action busy={busy} tone={QUIET} onClick={onUnlink}>
          {donationEdit.unlink}
        </Action>
      )}
    </PaymentActions>
  );
}
