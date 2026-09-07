"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import Notice from "@/components/Notice";
import ProfileSection from "@/components/admin/ProfileSection";
import { api, errorMessage } from "@/lib/api";
import { membershipEnding as texts, MEMBERSHIP_ENDING_REASONS } from "@/lib/texts";

function day(value: string | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "—";
}

export default function MembershipEndingCard({
  memberId,
  status,
  membershipYear,
  endedAt,
  endedReason,
  endedBy,
  onChanged,
}: {
  memberId: string;
  status: string;
  membershipYear: number;
  endedAt: string | null;
  endedReason: string | null;
  endedBy: string | null;
  onChanged: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const [reason, setReason] = useState<string>(MEMBERSHIP_ENDING_REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (status !== "ACTIVE") return null;

  async function run(call: Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await call;
      setPicking(false);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProfileSection icon="card" title={texts.title}>
      <p className="text-sm font-bold">
        {endedAt ? texts.ended(membershipYear) : texts.standing(membershipYear)}
      </p>

      {endedAt && (
        <dl className="text-sm space-y-1">
          <Row label={texts.endedReason} value={endedReason ?? "—"} />
          <Row label={texts.endedOn} value={day(endedAt)} ltr />
          <Row label={texts.endedBy} value={endedBy ?? "—"} />
        </dl>
      )}

      {picking ? (
        <div className="space-y-2">
          <label className="block text-xs font-bold" htmlFor="ending-reason">
            {texts.reasonLabel}
          </label>
          <select
            id="ending-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input text-sm"
          >
            {MEMBERSHIP_ENDING_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() =>
                run(api.post(`/api/admin/members/${memberId}/end-membership`, { reason }))
              }
              disabled={busy}
              className="btn text-sm flex-1"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              {busy ? "..." : texts.endConfirm}
            </button>
            <button
              onClick={() => setPicking(false)}
              className="btn text-sm"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              {texts.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {endedAt ? (
            <button
              onClick={() => run(api.del(`/api/admin/members/${memberId}/end-membership`))}
              disabled={busy}
              className="btn text-sm"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              {busy ? "..." : <IconLabel name="refresh">{texts.restore}</IconLabel>}
            </button>
          ) : (
            <button
              onClick={() => setPicking(true)}
              disabled={busy}
              className="btn text-sm"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              <IconLabel name="ban">{texts.end}</IconLabel>
            </button>
          )}
        </div>
      )}

      {error && <Notice tone="error">{error}</Notice>}
    </ProfileSection>
  );
}

function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt style={{ color: "var(--text-muted)" }}>{label}</dt>
      <dd className="font-bold" {...(ltr ? { dir: "ltr" as const } : {})}>
        {value}
      </dd>
    </div>
  );
}
