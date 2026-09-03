"use client";

import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";
import Money from "@/components/Money";
import { financeTotals as texts } from "@/lib/texts/expenses";

function Tile({
  icon,
  label,
  value,
  color,
}: {
  icon: IconName;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="card p-3 text-center">
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        <IconLabel name={icon}>{label}</IconLabel>
      </p>
      <Money value={value} digitsOnly className="text-base font-black" style={{ color }} />
    </div>
  );
}

export default function FinanceTotals({
  revenue,
  expenses,
  net,
}: {
  revenue: number;
  expenses: number;
  net: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Tile icon="wallet" label={texts.revenue} value={revenue} color="var(--mint-600)" />
      <Tile icon="banknote" label={texts.expenses} value={expenses} color="var(--copper-500)" />
      <Tile icon="chart" label={texts.net} value={net} color="var(--text-main)" />
    </div>
  );
}
