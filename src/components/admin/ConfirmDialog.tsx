"use client";

import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";

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
    <div
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl"
        style={{ background: "var(--mint-50)", direction: "rtl" }}
      >
        <DialogHeader title={<IconLabel name="warning">{title}</IconLabel>} onClose={onClose} />

        <div className="p-5 space-y-4">
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

          <button
            onClick={onClose}
            className="btn w-full text-sm"
            style={{
              background: "white",
              color: "var(--text-muted)",
              border: "1px solid var(--mint-200)",
            }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
