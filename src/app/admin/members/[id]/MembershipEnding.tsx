"use client";

import { useState } from "react";
import ConfirmDialogShell from "@/components/ConfirmDialogShell";
import IconLabel from "@/components/IconLabel";
import Notice from "@/components/Notice";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/clubTime";
import { membershipEnding as texts, MEMBERSHIP_ENDING_REASONS } from "@/lib/texts";

export function EndedRows({
  endedAt,
  endedReason,
  endedBy,
}: {
  endedAt: string;
  endedReason: string | null;
  endedBy: string | null;
}) {
  return (
    <>
      <Row label={texts.endedReason} value={endedReason ?? "—"} />
      <Row label={texts.endedOn} value={<bdi dir="ltr">{formatDate(endedAt)}</bdi>} />
      <Row label={texts.endedBy} value={endedBy ?? "—"} />
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt style={{ color: "var(--text-muted)" }}>{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

export default function MembershipEnding({
  memberId,
  memberName,
  year,
  ended,
  onChanged,
}: {
  memberId: string;
  memberName: string;
  year: number;
  ended: boolean;
  onChanged: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const [reason, setReason] = useState<string>(MEMBERSHIP_ENDING_REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() {
    setPicking(false);
    setError("");
  }

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

  const notice = error ? <Notice tone="error">{error}</Notice> : null;

  return (
    <>
      {ended ? (
        <button
          onClick={() => run(api.del(`/api/admin/members/${memberId}/end-membership`))}
          disabled={busy}
          className="btn btn-sm btn-ghost font-bold"
        >
          {busy ? "..." : <IconLabel name="refresh">{texts.restore}</IconLabel>}
        </button>
      ) : (
        <button
          onClick={() => setPicking(true)}
          disabled={busy}
          className="btn btn-sm btn-danger font-bold"
        >
          <IconLabel name="ban">{texts.end}</IconLabel>
        </button>
      )}

      {!picking && notice}

      {picking && (
        <ConfirmDialogShell title={texts.endTitle} onClose={close}>
          <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            {texts.endSubject(memberName, year)}
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {texts.endMeaning}
          </p>

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
          </div>

          <button
            onClick={() =>
              run(api.post(`/api/admin/members/${memberId}/end-membership`, { reason }))
            }
            disabled={busy}
            className="btn btn-danger w-full text-sm font-bold disabled:opacity-40"
          >
            {busy ? "..." : texts.endConfirm}
          </button>

          {notice}
        </ConfirmDialogShell>
      )}
    </>
  );
}
