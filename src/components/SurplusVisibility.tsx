"use client";

import { useState } from "react";
import DonorNameChoice from "@/components/DonorNameChoice";
import IconLabel from "@/components/IconLabel";
import InfoRow from "@/components/InfoRow";
import PaidAmountRows from "@/components/PaidAmountRows";
import { api, errorMessage } from "@/lib/api";
import { surplusCard as texts } from "@/lib/texts";

export default function SurplusVisibility({
  memberId,
  memberName,
  paidAmount,
  supportAmount,
  anonymous,
  onChanged,
}: {
  memberId: string;
  memberName: string;
  paidAmount: number | null;
  supportAmount: number;
  anonymous: boolean;
  onChanged: (anonymous: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  if (supportAmount <= 0) return null;

  async function pick(wantsName: boolean) {
    if (saving || wantsName === !anonymous) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await api.patch(`/api/members/${memberId}`, { surplusAnonymous: !wantsName });
      onChanged(!wantsName);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-4 fade-up space-y-3">
      <div className="space-y-2.5">
        <PaidAmountRows paidAmount={paidAmount} supportAmount={supportAmount} Row={InfoRow} />
      </div>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.hint(supportAmount)}
      </p>

      <DonorNameChoice wantsName={!anonymous} onPick={pick} memberName={memberName} />

      {error && (
        <p className="text-xs" style={{ color: "#991b1b" }}>
          <IconLabel name="warning">{error}</IconLabel>
        </p>
      )}
      {saved && !error && (
        <p className="text-xs" style={{ color: "var(--mint-700)" }}>
          {texts.saved}
        </p>
      )}
    </div>
  );
}
