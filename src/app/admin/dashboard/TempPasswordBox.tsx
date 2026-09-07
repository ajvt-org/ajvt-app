"use client";

import { MINT_SURFACE } from "@/components/admin/verbTones";
import { hoursLabel } from "@/lib/arabicPlural";
import { tempPassword as texts } from "@/lib/texts";

export default function TempPasswordBox({ value, hours }: { value: string; hours: number }) {
  return (
    <div
      className="mt-3 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
      style={MINT_SURFACE}
    >
      <div>
        <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
          {texts.handOver}
        </p>
        <p className="font-mono font-black text-lg" style={{ color: "var(--mint-700)" }} dir="ltr">
          {value}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {texts.validFor(hoursLabel(hours))}
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(value)}
        className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
        style={{ background: "var(--mint-600)", color: "white" }}
      >
        {texts.copy}
      </button>
    </div>
  );
}
