"use client";

import { useEffect, useState } from "react";
import ProfileSection from "@/components/admin/ProfileSection";
import Money from "@/components/Money";
import { moneyDigits } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { withRunningBalance, type LedgerInput, type LedgerTotals } from "@/lib/activityLedger";
import { activityFinance as texts } from "@/lib/texts";

interface FinanceResponse {
  rows: LedgerInput[];
  totals: LedgerTotals;
}

function Total({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <Money value={value} digitsOnly className="text-base font-black" style={{ color }} />
    </div>
  );
}

export default function ActivityFinance({ activityId }: { activityId: string }) {
  const [data, setData] = useState<FinanceResponse | null>(null);

  useEffect(() => {
    fetch(`/api/admin/activities/${activityId}/finance`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, [activityId]);

  if (!data) return null;

  const entries = withRunningBalance(data.rows);

  return (
    <ProfileSection icon="wallet" title={texts.heading(entries.length)}>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Total label={texts.income} value={data.totals.income} color="var(--mint-600)" />
        <Total label={texts.expenses} value={data.totals.expenses} color="var(--copper-500)" />
        <Total label={texts.balance} value={data.totals.balance} color="var(--text-main)" />
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
          {texts.empty}
        </p>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <p className="font-bold truncate" style={{ color: "var(--text-main)" }}>
                  {entry.label}
                </p>
                <p style={{ color: "var(--text-muted)" }}>{formatDate(entry.date)}</p>
              </div>
              <div className="shrink-0 text-left">
                <p
                  className="font-black"
                  style={{
                    color: entry.kind === "income" ? "var(--mint-600)" : "var(--copper-500)",
                  }}
                  dir="ltr"
                >
                  {entry.kind === "income" ? "+" : "-"}
                  {moneyDigits(entry.amount)}
                </p>
                <Money value={entry.balance} digitsOnly style={{ color: "var(--text-muted)" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}
