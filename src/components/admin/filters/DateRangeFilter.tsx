"use client";

import { filterSheet as texts } from "@/lib/texts";

export default function DateRangeFilter({
  from,
  to,
  idPrefix = "range",
  onChange,
}: {
  from: string;
  to: string;
  idPrefix?: string;
  onChange: (range: { from: string; to: string }) => void;
}) {
  const fromId = `${idPrefix}-from-date`;
  const toId = `${idPrefix}-to-date`;

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <label className="text-xs shrink-0" style={{ color: "var(--text-muted)" }} htmlFor={fromId}>
          {texts.from}
        </label>
        <input
          id={fromId}
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => onChange({ from: e.target.value, to })}
          className="input text-xs min-w-0 flex-1"
        />
      </div>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <label className="text-xs shrink-0" style={{ color: "var(--text-muted)" }} htmlFor={toId}>
          {texts.to}
        </label>
        <input
          id={toId}
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => onChange({ from, to: e.target.value })}
          className="input text-xs min-w-0 flex-1"
        />
      </div>
    </div>
  );
}
