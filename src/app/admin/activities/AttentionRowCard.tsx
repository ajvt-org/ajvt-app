"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import NumericRanges from "@/components/NumericRanges";
import { attentionHref, type AttentionRow } from "@/lib/activityAttention";
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

function Decision({
  label,
  icon,
  tone,
  disabled,
  onPick,
}: {
  label: string;
  icon: "check" | "close";
  tone: "accept" | "refuse";
  disabled: boolean;
  onPick: () => void;
}) {
  const style =
    tone === "accept"
      ? { background: "var(--mint-600)", color: "white" }
      : { background: "white", color: "#991b1b", border: "1.5px solid #fca5a5" };
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-label={label}
      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
      style={style}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

export default function AttentionRowCard({
  row,
  busy,
  onSettle,
}: {
  row: AttentionRow;
  busy: boolean;
  onSettle: (row: AttentionRow, accept: boolean) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2"
      style={{ background: "var(--mint-50)" }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold" style={{ color: "var(--text-main)" }}>
          {row.who}
        </span>
        <span className="block text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
          {row.activityTitle}
        </span>
      </span>
      <Waited since={row.since} />
      {row.settle ? (
        <>
          <Decision
            label={texts.acceptRow(row.who)}
            icon="check"
            tone="accept"
            disabled={busy}
            onPick={() => onSettle(row, true)}
          />
          <Decision
            label={texts.refuseRow(row.who)}
            icon="close"
            tone="refuse"
            disabled={busy}
            onPick={() => onSettle(row, false)}
          />
        </>
      ) : (
        <Link
          href={attentionHref(row)}
          aria-label={texts.openRow(row.who)}
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "white", color: "var(--mint-700)" }}
        >
          <Icon name="chevronLeft" size={15} />
        </Link>
      )}
    </div>
  );
}
