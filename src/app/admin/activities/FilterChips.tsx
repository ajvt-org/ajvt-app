"use client";

export interface FilterOption {
  value: string;
  label: string;
}

export default function FilterChips({
  options,
  value,
  onPick,
  label,
}: {
  options: FilterOption[];
  value: string;
  onPick: (value: string) => void;
  label: string;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap" role="group" aria-label={label}>
      {options.map((option) => {
        const on = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onPick(option.value)}
            aria-pressed={on}
            className="text-xs px-3 py-1.5 rounded-lg font-bold"
            style={{
              background: on ? "var(--mint-600)" : "white",
              color: on ? "white" : "var(--mint-700)",
              border: on ? "none" : "1px solid var(--mint-100)",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
