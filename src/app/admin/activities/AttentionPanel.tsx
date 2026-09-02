"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import NumericRanges from "@/components/NumericRanges";
import { attentionHref, sortAttention, type AttentionRow } from "@/lib/activityAttention";
import { daysWaiting } from "@/lib/waitingRequests";
import { activityAttention as texts } from "@/lib/texts";

function Waited({ since }: { since: string }) {
  const days = daysWaiting(new Date(since), new Date());
  return (
    <span className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>
      <NumericRanges>{days < 1 ? texts.today : texts.waiting(days)}</NumericRanges>
    </span>
  );
}

function Row({ row }: { row: AttentionRow }) {
  return (
    <Link
      href={attentionHref(row)}
      className="flex items-center gap-2 rounded-xl px-3 py-2"
      style={{ background: "var(--mint-50)" }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold" style={{ color: "var(--text-main)" }}>
          {texts.kinds[row.kind]} — {row.who}
        </span>
        <span className="block text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
          {row.activityTitle}
        </span>
      </span>
      <Waited since={row.since} />
      <Icon name="chevronLeft" size={14} className="shrink-0" />
    </Link>
  );
}

export default function AttentionPanel({
  rows,
  newestFirst,
  onOrderChange,
}: {
  rows: AttentionRow[];
  newestFirst: boolean;
  onOrderChange: (newestFirst: boolean) => void;
}) {
  const [open, setOpen] = useState(true);

  const waiting = sortAttention(rows, newestFirst);

  return (
    <div className="card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((shown) => !shown)}
          aria-expanded={open}
          className="text-sm font-bold min-w-0 flex-1 text-start"
          style={{ color: "var(--text-main)" }}
        >
          <IconLabel name="clock">
            {texts.title}
            {waiting.length > 0 ? ` (${waiting.length})` : ""}
          </IconLabel>
        </button>
        {waiting.length > 1 && (
          <button
            type="button"
            onClick={() => onOrderChange(!newestFirst)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            {newestFirst ? texts.newestFirst : texts.oldestFirst}
          </button>
        )}
      </div>

      {waiting.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.empty}
        </p>
      ) : (
        open && (
          <div className="space-y-1.5">
            {waiting.map((row) => (
              <Row key={row.id} row={row} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
