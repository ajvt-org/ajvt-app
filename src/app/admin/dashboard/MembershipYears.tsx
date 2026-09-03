"use client";

import { formatDate } from "@/lib/utils";
import IconLabel from "@/components/IconLabel";
import { STATUS_BADGE, STATUS_ICON, STATUS_LABEL } from "./constants";
import type { MembershipYear } from "./membershipTypes";
import Money from "@/components/Money";

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
          className="flex flex-wrap items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded-lg"
          style={{
            background: year.year === currentYear ? "var(--mint-100)" : "white",
            border: "1px solid var(--mint-100)",
          }}
        >
          <span className="font-black" style={{ color: "var(--mint-700)" }} dir="ltr">
            {year.year}
          </span>
          <span className={`badge ${STATUS_BADGE[year.status]}`}>
            <IconLabel name={STATUS_ICON[year.status]}>{STATUS_LABEL[year.status]}</IconLabel>
          </span>
          <span style={{ color: "var(--text-main)" }}>
            {year.paidAmount ? <Money value={year.paidAmount} /> : "—"}
            {year.paymentMethod ? ` · ${year.paymentMethod}` : ""}
          </span>
          <span style={{ color: "var(--text-muted)" }}>
            {year.recordedBy ? year.recordedBy : formatDate(year.createdAt)}
          </span>
          {year.rejectionReason && (
            <span className="w-full text-[11px]" style={{ color: "#991b1b" }}>
              {year.rejectionReason}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
