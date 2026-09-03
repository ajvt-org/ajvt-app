"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import { groupAttention, type AttentionRow } from "@/lib/activityAttention";
import { activityAttention as texts } from "@/lib/texts";
import AttentionOrder from "./AttentionOrder";
import AttentionRowCard from "./AttentionRowCard";
import { useAttentionActions } from "./useAttentionActions";

export default function AttentionPanel({
  rows,
  newestFirst,
  onOrderChange,
  reload,
}: {
  rows: AttentionRow[];
  newestFirst: boolean;
  onOrderChange: (newestFirst: boolean) => void;
  reload: () => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const { busy, settle } = useAttentionActions(reload);

  if (rows.length === 0) return null;

  const groups = groupAttention(rows, newestFirst);

  return (
    <div className="card p-3 space-y-2">
      <button
        type="button"
        onClick={() => setOpen((shown) => !shown)}
        aria-expanded={open}
        className="text-sm font-bold w-full text-start"
        style={{ color: "var(--text-main)" }}
      >
        <IconLabel name="clock">{`${texts.title} (${rows.length})`}</IconLabel>
      </button>

      {rows.length > 1 && <AttentionOrder newestFirst={newestFirst} onChange={onOrderChange} />}

      {open && (
        <div
          className="space-y-2 overflow-y-auto pe-1"
          style={{ maxHeight: "10rem", overscrollBehavior: "contain" }}
        >
          {groups.map((group) => (
            <div key={group.kind} className="space-y-1.5">
              <p className="text-[11px] font-bold" style={{ color: "var(--mint-700)" }}>
                {texts.group(texts.kinds[group.kind], group.rows.length)}
              </p>
              {group.rows.map((row) => (
                <AttentionRowCard key={row.id} row={row} busy={busy !== ""} onSettle={settle} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
