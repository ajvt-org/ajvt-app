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
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ConfirmDialogShell title={title} onClose={onClose}>
      <div className="text-sm" style={{ color: "var(--text-main)" }}>
        {message}
      </div>

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
