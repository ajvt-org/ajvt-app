"use client";

import IconLabel from "@/components/IconLabel";
import type { Proof } from "./paymentTypes";

const PRIMARY = { background: "var(--mint-600)", color: "white" };
const DANGER = { background: "#fee2e2", color: "#991b1b" };
const QUIET = { background: "var(--mint-100)", color: "var(--mint-700)" };

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
    <div className="flex flex-wrap gap-2 mt-2">
      {proof.status === "PENDING" && (
        <>
          <Action busy={busy} tone={PRIMARY} onClick={() => onReview("ACTIVE")}>
            <IconLabel name="check">قبول</IconLabel>
          </Action>
          <Action busy={busy} tone={DANGER} onClick={() => onReview("REJECTED")}>
            <IconLabel name="close">رفض</IconLabel>
          </Action>
        </>
      )}
      {proof.status === "ACTIVE" && (
        <Action busy={busy} tone={DANGER} onClick={() => onReview("REJECTED")}>
          <IconLabel name="ban">إبطال التبرع</IconLabel>
        </Action>
      )}
      {proof.status === "REJECTED" && (
        <Action busy={busy} tone={PRIMARY} onClick={() => onReview("ACTIVE")}>
          <IconLabel name="refresh">إعادة تفعيل</IconLabel>
        </Action>
      )}

      <Action busy={busy} tone={QUIET} onClick={onEdit}>
        <IconLabel name="pencil">تعديل</IconLabel>
      </Action>
      <Action busy={busy} tone={DANGER} onClick={onDelete}>
        <IconLabel name="trash">حذف نهائياً</IconLabel>
      </Action>

      {proof.source === "PUBLIC" &&
        (proof.memberId ? (
          <Action busy={busy} tone={QUIET} onClick={onUnlink}>
            إلغاء الربط
          </Action>
        ) : (
          <Action busy={busy} tone={QUIET} onClick={onLink}>
            <IconLabel name="link">ربط بعضو مسجل</IconLabel>
          </Action>
        ))}
    </div>
  );
}
