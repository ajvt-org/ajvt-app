"use client";

import type { FilterAxis } from "./activitiesView";
import { activityRow as texts } from "@/lib/texts";

export default function FilterAxisRow({
  axis,
  value,
  countOf,
  onPick,
}: {
  axis: FilterAxis;
  value: string;
  countOf: (value: string) => number;
  onPick: (value: string) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className="text-[11px] font-bold shrink-0 pt-1.5"
        style={{ color: "var(--text-muted)", width: "2.75rem" }}
      >
        {axis.label}
      </span>
      <div className="flex gap-1.5 flex-wrap" role="group" aria-label={axis.label}>
        {axis.options.map((option) => {
          const on = value === option.value;
          const count = countOf(option.value);
          return (
            <button
              key={option.value}
              onClick={() => onPick(option.value)}
              aria-pressed={on}
              aria-label={texts.filters.pick(axis.label, option.label)}
              className="text-xs px-2 py-1 rounded-lg font-bold flex items-center gap-1"
              style={{
                background: on ? "var(--mint-600)" : "var(--mint-50)",
                color: on ? "white" : "var(--mint-700)",
                border: on ? "none" : "1px solid var(--mint-100)",
              }}
            >
              {option.label}
              <span
                className="badge-numeral text-[10px]"
                style={{ color: on ? "rgba(255,255,255,0.75)" : "var(--text-muted)" }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
