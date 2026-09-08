"use client";

import { useState } from "react";
import ConfirmDialogShell from "@/components/admin/ConfirmDialogShell";
import { receiptAdmin as texts } from "@/lib/texts/receipt";

export default function VoidReceiptDialog({
  number,
  loading,
  onConfirm,
  onClose,
}: {
  number: string;
  loading: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const given = reason.trim();

  return (
    <ConfirmDialogShell title={texts.voidTitle} onClose={onClose}>
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <bdi dir="ltr">{number}</bdi>
      </p>
      <p className="text-sm" style={{ color: "var(--text-main)" }}>
        {texts.voidConsequence}
      </p>

      <label className="block text-xs font-bold" htmlFor="void-reason">
        {texts.voidReasonLabel}
      </label>
      <textarea
        id="void-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={200}
        placeholder={texts.voidReasonPlaceholder}
        className="input text-sm"
        autoFocus
      />

      <button
        onClick={() => onConfirm(given)}
        disabled={!given || loading}
        className="btn w-full text-sm font-bold disabled:opacity-40"
        style={{ background: "#dc2626", color: "white" }}
      >
        {loading ? "..." : texts.voidConfirm}
      </button>
    </ConfirmDialogShell>
  );
}
