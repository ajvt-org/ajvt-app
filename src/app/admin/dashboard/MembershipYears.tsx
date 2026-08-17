"use client";

import { formatDate } from "@/lib/utils";
import type { MembershipYear } from "./membershipTypes";

export default function MembershipYears({
  years,
  currentYear,
}: {
  years: MembershipYear[];
  currentYear: number;
}) {
  if (years.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {years.map((year) => (
        <div
          key={year.id}
          className="flex items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded-lg"
          style={{
            background: year.year === currentYear ? "var(--mint-100)" : "white",
            border: "1px solid var(--mint-100)",
          }}
        >
          <span className="font-black" style={{ color: "var(--mint-700)" }} dir="ltr">
            {year.year}
          </span>
          <span style={{ color: "var(--text-main)" }}>
            {year.paidAmount ? `${year.paidAmount} أوقية` : "—"}
            {year.paymentMethod ? ` · ${year.paymentMethod}` : ""}
          </span>
          <span style={{ color: "var(--text-muted)" }}>
            {year.recordedBy ? year.recordedBy : formatDate(year.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
