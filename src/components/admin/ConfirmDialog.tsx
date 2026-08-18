"use client";

import ConfirmDialogShell from "./ConfirmDialogShell";

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "تأكيد",
  danger,
  loading,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ConfirmDialogShell title={title} onClose={onClose}>
      <p className="text-sm" style={{ color: "var(--text-main)" }}>
        {message}
      </p>

      <button
        onClick={onConfirm}
        disabled={loading}
        className="btn w-full text-sm font-bold disabled:opacity-40"
        style={{ background: danger ? "#dc2626" : "var(--mint-600)", color: "white" }}
      >
        {loading ? "..." : confirmLabel}
      </button>
    </ConfirmDialogShell>
  );
}
