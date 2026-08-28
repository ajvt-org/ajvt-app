"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { villagesDialog } from "@/lib/texts";
import { VILLAGE_NAME_MAX } from "@/lib/villages";
import type { Village } from "./types";

export default function VillageRow({
  village,
  busy,
  renaming,
  renameValue,
  onRenameValue,
  onStartRename,
  onCancelRename,
  onSaveRename,
  onDelete,
}: {
  village: Village;
  busy: boolean;
  renaming: boolean;
  renameValue: string;
  onRenameValue: (value: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onSaveRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-2">
        {renaming ? (
          <>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => onRenameValue(e.target.value)}
              maxLength={VILLAGE_NAME_MAX}
              className="input text-sm flex-1"
              autoFocus
            />
            <button
              onClick={onSaveRename}
              disabled={busy}
              className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
              style={{ background: "var(--mint-600)", color: "white" }}
            >
              {busy ? "..." : villagesDialog.save}
            </button>
            <button
              onClick={onCancelRename}
              className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              {villagesDialog.cancel}
            </button>
          </>
        ) : (
          <>
            <span
              className="text-sm font-bold flex-1 truncate"
              style={{ color: "var(--text-main)" }}
            >
              {village.name}
              {village.count ? (
                <span className="text-xs font-normal mr-1.5" style={{ color: "var(--text-muted)" }}>
                  ({village.count})
                </span>
              ) : null}
            </span>
            <button
              onClick={onStartRename}
              disabled={busy}
              className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              <IconLabel name="pencil">{villagesDialog.edit}</IconLabel>
            </button>
            <button
              onClick={onDelete}
              disabled={busy}
              className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              {busy ? "..." : <Icon name="trash" size={14} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
