"use client";

import IconLabel from "@/components/IconLabel";
import { PAYMENT_METHODS } from "@/lib/donations";
import type { UnassignedDonation } from "./types";

export default function UnassignedDonations({
  rows,
  chosen,
  busyId,
  onChoose,
  onSave,
}: {
  rows: UnassignedDonation[];
  chosen: Record<string, string>;
  busyId: string | null;
  onChoose: (id: string, method: string) => void;
  onSave: (id: string) => void;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
        <IconLabel name="card">مبالغ بلا طريقة دفع محددة ({rows.length})</IconLabel>
      </p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate" style={{ color: "var(--text-main)" }}>
                {row.name}
              </p>
              <p className="text-xs" style={{ color: "var(--mint-600)" }}>
                {row.amount} أوقية
              </p>
            </div>
            <select
              value={chosen[row.id] || ""}
              onChange={(e) => onChoose(row.id, e.target.value)}
              className="input text-xs"
              style={{ width: "auto" }}
              aria-label={`طريقة الدفع لـ ${row.name}`}
            >
              <option value="">اختر طريقة الدفع...</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button
              onClick={() => onSave(row.id)}
              disabled={!chosen[row.id] || busyId === row.id}
              className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
              style={{ background: "var(--mint-600)", color: "white" }}
            >
              {busyId === row.id ? "..." : "حفظ"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
