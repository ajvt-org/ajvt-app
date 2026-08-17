"use client";

import BarChart from "@/components/admin/BarChart";
import type { Breakdown } from "./memberStats";

function BreakdownCard({ title, rows }: { title: string; rows: Breakdown }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
        {title}
      </p>
      <div className="space-y-1.5">
        {rows.map(([label, count]) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span style={{ color: "var(--text-main)" }} className="truncate">
              {label}
            </span>
            <span className="font-black shrink-0" style={{ color: "var(--mint-600)" }}>
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StatsPanel({
  signups,
  byAge,
  byPayment,
}: {
  signups: { label: string; value: number }[];
  byAge: Breakdown;
  byPayment: Breakdown;
}) {
  return (
    <div className="space-y-3 mb-5">
      <div className="card p-4">
        <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
          التسجيلات خلال آخر 14 يوماً
        </p>
        <BarChart data={signups} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <BreakdownCard title="حسب العصر" rows={byAge} />
        <BreakdownCard title="حسب طريقة الدفع" rows={byPayment} />
      </div>
    </div>
  );
}
