"use client";

import IconLabel from "@/components/IconLabel";
import { counted } from "@/lib/arabicCount";
import { ACTIVE_MEMBER } from "@/lib/messages";

export default function UpToDateSummary({
  year,
  current,
  active,
  showing,
  onShowCurrent,
  onShowFormer,
}: {
  year: number;
  current: number;
  active: number;
  showing: "current" | "former" | null;
  onShowCurrent: () => void;
  onShowFormer: () => void;
}) {
  if (active === 0) return null;

  const former = active - current;
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
        onClick={onShowCurrent}
        className="text-xs px-2.5 py-1 rounded-lg font-bold"
        style={chip(showing === "current")}
      >
        <IconLabel name="check">{current} حالي</IconLabel>
      </button>
      <button
        onClick={onShowFormer}
        className="text-xs px-2.5 py-1 rounded-lg font-bold"
        style={chip(showing === "former")}
      >
        <IconLabel name="clock">{former} سابق</IconLabel>
      </button>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        من {counted(active, ACTIVE_MEMBER)}
      </span>
    </div>
  );
}
