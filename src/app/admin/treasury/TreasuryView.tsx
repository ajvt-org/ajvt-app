"use client";

import IconLabel from "@/components/IconLabel";
import type { MethodTotal, Treasury } from "@/lib/treasury";
import { treasury as texts } from "@/lib/texts";

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="grid items-center gap-x-2 py-1.5 text-sm"
      style={{ gridTemplateColumns: "1fr auto auto" }}
    >
      <span className="optical-name" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="font-bold optical-name" style={{ color: "var(--text-main)" }}>
        {texts.currency}
      </span>
      <span
        dir="ltr"
        className="font-bold optical-numeral"
        style={{
          color: value < 0 ? "var(--danger)" : "var(--text-main)",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function MethodCard({
  heading,
  rows,
  empty,
}: {
  heading: string;
  rows: MethodTotal[];
  empty: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-sm font-bold mb-1" style={{ color: "var(--text-main)" }}>
        <IconLabel name="banknote">{heading}</IconLabel>
      </p>
      {rows.length === 0 ? (
        <p className="text-xs py-2" style={{ color: "var(--text-muted)" }}>
          {empty}
        </p>
      ) : (
        rows.map((row) => <Line key={row.method} label={row.method} value={row.amount} />)
      )}
    </div>
  );
}

export default function TreasuryView({ treasury }: { treasury: Treasury }) {
  return (
    <div className="px-5 py-5 space-y-4">
      <div
        className="card p-5 text-center"
        style={{ background: "linear-gradient(160deg, var(--mint-700), var(--mint-600))" }}
      >
        <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.75)" }}>
          {texts.balance}
        </p>
        <p className="font-black text-white mt-1" style={{ fontSize: 30 }}>
          <span dir="rtl">{texts.ouguiya(treasury.balance)}</span>
        </p>
        <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.75)" }}>
          {texts.balanceHint}
        </p>
      </div>

      <div className="card p-4">
        <Line label={texts.income} value={treasury.income} />
        <Line label={texts.fees} value={treasury.fees} />
        <Line label={texts.support} value={treasury.support} />
        <div style={{ borderTop: "1px solid var(--mint-100)" }} />
        <Line label={texts.spending} value={treasury.spending} />
      </div>

      <MethodCard heading={texts.byMethod} rows={treasury.byMethod} empty={texts.noIncome} />

      <MethodCard
        heading={texts.spendingByMethod}
        rows={treasury.spendingByMethod}
        empty={texts.noSpending}
      />
    </div>
  );
}
