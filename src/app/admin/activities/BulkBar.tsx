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
      className="card p-3 flex items-center gap-2 flex-wrap"
      style={{ background: "var(--mint-50)" }}
    >
      <span className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
        {texts.picked(count)}
      </span>
      <span className="flex-1" />
      <button
        onClick={onClose}
        disabled={busy}
        className="btn btn-sm text-xs font-bold"
        style={{ background: "white", color: "var(--mint-700)" }}
      >
        <IconLabel name="ban">{texts.bulkClose}</IconLabel>
      </button>
      <button
        onClick={() => setConfirming(true)}
        disabled={busy}
        className="btn btn-sm text-xs font-bold"
        style={{ background: "white", color: "#991b1b", border: "1.5px solid #fca5a5" }}
      >
        <IconLabel name="trash">{texts.bulkDelete}</IconLabel>
      </button>
      <button
        onClick={onClear}
        disabled={busy}
        className="text-xs font-bold px-2"
        style={{ color: "var(--text-muted)" }}
      >
        {texts.bulkClear}
      </button>

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
