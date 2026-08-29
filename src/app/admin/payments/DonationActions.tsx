"use client";

import IconLabel from "@/components/IconLabel";
import { donationActions, donationEdit } from "@/lib/texts";
import { DANGER, PRIMARY, QUIET } from "./donationTones";
import type { Proof } from "./paymentTypes";

function Action({
  busy,
  tone,
  onClick,
  children,
}: {
  busy: boolean;
  tone: React.CSSProperties;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="text-xs px-3 py-1.5 rounded-lg font-bold"
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
  onDelete,
  onLink,
  onUnlink,
}: {
  proof: Proof;
  busy: boolean;
  onReview: (status: "ACTIVE" | "REJECTED") => void;
  onEdit: () => void;
  onDelete: () => void;
  onLink: () => void;
  onUnlink: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {proof.status === "PENDING" && (
        <>
          <Action busy={busy} tone={PRIMARY} onClick={() => onReview("ACTIVE")}>
            <IconLabel name="check">{donationActions.accept}</IconLabel>
          </Action>
          <Action busy={busy} tone={DANGER} onClick={() => onReview("REJECTED")}>
            <IconLabel name="close">{donationActions.refuse}</IconLabel>
          </Action>
        </>
      )}
      {proof.status === "REJECTED" && (
        <Action busy={busy} tone={PRIMARY} onClick={() => onReview("ACTIVE")}>
          <IconLabel name="refresh">{donationActions.restore}</IconLabel>
        </Action>
      )}

      <Action busy={busy} tone={QUIET} onClick={onEdit}>
        <IconLabel name="pencil">{donationActions.edit}</IconLabel>
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

      <span className="flex items-center gap-2 ms-auto ps-2">
        {proof.status === "ACTIVE" && (
          <Action busy={busy} tone={DANGER} onClick={() => onReview("REJECTED")}>
            <IconLabel name="ban">{donationActions.revoke}</IconLabel>
          </Action>
        )}
        <Action busy={busy} tone={DANGER} onClick={onDelete}>
          <IconLabel name="trash">{donationActions.remove}</IconLabel>
        </Action>
      </span>
    </div>
  );
}
