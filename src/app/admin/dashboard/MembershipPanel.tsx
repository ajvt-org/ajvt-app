"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import { membershipSummary as texts } from "@/lib/texts";
import MembershipYears from "./MembershipYears";
import RenewForm from "./RenewForm";
import YearAmountForm from "./YearAmountForm";
import type { MembershipHistory } from "./membershipTypes";

function fetchHistory(memberId: string): Promise<MembershipHistory | null> {
  return api.get<MembershipHistory>(`/api/admin/members/${memberId}/memberships`).catch(() => null);
}

export default function MembershipPanel({ memberId }: { memberId: string }) {
  const [history, setHistory] = useState<MembershipHistory | null>(null);

  useEffect(() => {
    fetchHistory(memberId).then(setHistory);
  }, [memberId]);

  if (!history) return null;

  const reload = () => fetchHistory(memberId).then(setHistory);
  const current = history.memberships.find((y) => y.year === history.currentYear);

  return (
    <div className="card p-4 space-y-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="card">{texts.years}</IconLabel>
      </p>

      <MembershipYears years={history.memberships} currentYear={history.currentYear} />

      {history.refusal === "alreadyRenewed" && (
        <YearAmountForm
          memberId={memberId}
          year={history.currentYear}
          amount={current?.paidAmount == null ? null : current.paidAmount + current.supportAmount}
          onSaved={reload}
        />
      )}

      {!history.refusal && (
        <RenewForm memberId={memberId} year={history.currentYear} onRenewed={reload} />
      )}
    </div>
  );
}
