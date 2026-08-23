"use client";

import IconLabel from "@/components/IconLabel";
import { counted } from "@/lib/arabicCount";
import { ACTIVE_MEMBER, NOT_RENEWED, SETTLED } from "@/lib/messages";

export default function UpToDateSummary({
  year,
  paid,
  active,
  showing,
  onShowPaid,
  onShowBehind,
}: {
  year: number;
  paid: number;
  active: number;
  showing: "paid" | "behind" | null;
  onShowPaid: () => void;
  onShowBehind: () => void;
}) {
  if (active === 0) return null;

  const behind = active - paid;
  const chip = (on: boolean) => ({
    background: on ? "var(--mint-600)" : "var(--mint-100)",
    color: on ? "white" : "var(--mint-700)",
  });

  return (
    <div className="card p-3 mb-3 flex items-center gap-2 flex-wrap">
      <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
        عضوية {year}
      </p>
      <button
        onClick={onShowPaid}
        className="text-xs px-2.5 py-1 rounded-lg font-bold"
        style={chip(showing === "paid")}
      >
        <IconLabel name="check">{counted(paid, SETTLED)}</IconLabel>
      </button>
      <button
        onClick={onShowBehind}
        className="text-xs px-2.5 py-1 rounded-lg font-bold"
        style={chip(showing === "behind")}
      >
        <IconLabel name="clock">{counted(behind, NOT_RENEWED)}</IconLabel>
      </button>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        من {counted(active, ACTIVE_MEMBER)}
      </span>
    </div>
  );
}
