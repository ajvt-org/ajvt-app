"use client";

export default function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <label
        className="text-xs shrink-0"
        style={{ color: "var(--text-muted)" }}
        htmlFor="from-date"
      >
        من
      </label>
      <input
        id="from-date"
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => onChange({ from: e.target.value, to })}
        className="input text-xs"
        style={{ width: "auto" }}
      />
      <label className="text-xs shrink-0" style={{ color: "var(--text-muted)" }} htmlFor="to-date">
        إلى
      </label>
      <input
        id="to-date"
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => onChange({ from, to: e.target.value })}
        className="input text-xs"
        style={{ width: "auto" }}
      />
    </div>
  );
}
