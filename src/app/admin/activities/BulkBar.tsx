"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { activityRow as texts } from "@/lib/texts";

export default function BulkBar({
  count,
  busy,
  onClose,
  onDelete,
  onClear,
}: {
  count: number;
  busy: boolean;
  onClose: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (count === 0) return null;

  return (
    <div
      className="fixed bottom-0 z-40 px-3 py-2.5"
      style={{
        insetInline: 0,
        background: "var(--mint-50)",
        borderTop: "1px solid var(--mint-200)",
        boxShadow: "0 -6px 20px rgba(26,63,51,0.12)",
        paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto space-y-2" style={{ maxWidth: "42rem" }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
            {texts.picked(count)}
          </span>
          <span className="flex-1" />
          <button
            onClick={onClear}
            disabled={busy}
            className="text-xs font-bold"
            style={{ color: "var(--text-muted)" }}
          >
            {texts.bulkClear}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="btn btn-sm font-bold flex-1"
            style={{ background: "white", color: "var(--mint-700)" }}
          >
            <IconLabel name="ban">{texts.bulkClose}</IconLabel>
          </button>
          <button
            onClick={() => setConfirming(true)}
            disabled={busy}
            className="btn btn-sm font-bold flex-1"
            style={{ background: "white", color: "#991b1b", border: "1.5px solid #fca5a5" }}
          >
            <IconLabel name="trash">{texts.bulkDelete}</IconLabel>
          </button>
        </div>
      </div>

      {confirming && (
        <ConfirmDialog
          title={texts.bulkDeleteTitle}
          message={texts.bulkDeleteMessage(count)}
          confirmLabel={texts.bulkDeleteConfirm}
          danger
          loading={busy}
          onConfirm={() => {
            setConfirming(false);
            onDelete();
          }}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
