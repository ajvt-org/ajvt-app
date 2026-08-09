"use client";

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export default function BarChart({ data, height = 120, color = "var(--mint-600)" }: BarChartProps) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 20);
          const x = i * barWidth;
          return (
            <g key={i}>
              <rect
                x={x + barWidth * 0.15}
                y={height - 20 - barHeight}
                width={barWidth * 0.7}
                height={barHeight}
                fill={color}
                rx={1}
              />
              <text
                x={x + barWidth / 2}
                y={height - 20 - barHeight - 3}
                textAnchor="middle"
                fontSize="6"
                fill="var(--text-main)"
              >
                {d.value > 0 ? d.value : ""}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex" style={{ direction: "ltr" }}>
        {data.map((d, i) => (
          <div key={i} style={{ width: `${barWidth}%` }} className="text-center">
            <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
