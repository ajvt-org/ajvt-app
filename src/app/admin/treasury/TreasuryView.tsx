"use client";

import IconLabel from "@/components/IconLabel";
import type { Treasury } from "@/lib/treasury";
import { treasury as texts } from "@/lib/texts";

function Amount({ value }: { value: number }) {
  return (
    <span dir="rtl" style={{ color: value < 0 ? "var(--danger)" : undefined }}>
      {texts.ouguiya(value)}
    </span>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="font-bold" style={{ color: "var(--text-main)" }}>
        <Amount value={value} />
      </span>
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

      <div className="card p-4">
        <p className="text-sm font-bold mb-1" style={{ color: "var(--text-main)" }}>
          <IconLabel name="banknote">{texts.byMethod}</IconLabel>
        </p>
        {treasury.byMethod.length === 0 ? (
          <p className="text-xs py-2" style={{ color: "var(--text-muted)" }}>
            {texts.noIncome}
          </p>
        ) : (
          treasury.byMethod.map((row) => (
            <Line key={row.method} label={row.method} value={row.amount} />
          ))
        )}
      </div>
    </div>
  );
}
