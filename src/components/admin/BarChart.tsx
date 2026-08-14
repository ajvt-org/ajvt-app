"use client";

import { useState } from "react";

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export default function BarChart({ data, height = 120, color = "var(--mint-600)" }: BarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  if (data.length === 0) return null;

  const max = Math.max(1, ...data.map((d) => d.value));
  const peakIndex = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);

  return (
    <div>
      <div
        className="flex items-stretch gap-[2px]"
        style={{ height, direction: "ltr", borderBottom: "1px solid var(--mint-100)" }}
      >
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          const active = activeIndex === i;
          const showLabel = d.value > 0 && (active || i === peakIndex);
          return (
            <div
              key={i}
              className="relative flex-1"
              tabIndex={d.value > 0 ? 0 : undefined}
              role={d.value > 0 ? "img" : undefined}
              aria-label={d.value > 0 ? `${d.label}: ${d.value}` : undefined}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex((h) => (h === i ? null : h))}
              onFocus={() => setActiveIndex(i)}
              onBlur={() => setActiveIndex((h) => (h === i ? null : h))}
              style={{ outline: "none" }}
            >
              {showLabel && (
                <span
                  className="absolute font-bold whitespace-nowrap"
                  style={{
                    bottom: `calc(${pct}% + 4px)`,
                    insetInlineStart: "50%",
                    transform: "translateX(-50%)",
                    fontSize: "10px",
                    color: "var(--text-main)",
                  }}
                >
                  {d.value}
                </span>
              )}
              <div
                className="absolute bottom-0 mx-auto inset-x-0"
                style={{
                  height: `${pct}%`,
                  maxWidth: 22,
                  background: active ? "var(--mint-700)" : color,
                  borderRadius: "4px 4px 0 0",
                  transition: "background 0.15s",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-[2px] mt-1" style={{ direction: "ltr" }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
