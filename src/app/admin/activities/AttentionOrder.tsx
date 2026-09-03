"use client";

import { activityAttention as texts } from "@/lib/texts";

export default function AttentionOrder({
  newestFirst,
  onChange,
}: {
  newestFirst: boolean;
  onChange: (newestFirst: boolean) => void;
}) {
  const options: [string, boolean][] = [
    [texts.oldestFirst, false],
    [texts.newestFirst, true],
  ];

  return (
    <div className="flex gap-1.5" role="group" aria-label={texts.order}>
      {options.map(([label, value]) => {
        const on = value === newestFirst;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={on}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
            style={{
              background: on ? "var(--mint-600)" : "white",
              color: on ? "white" : "var(--mint-700)",
              border: on ? "none" : "1px solid var(--mint-100)",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
