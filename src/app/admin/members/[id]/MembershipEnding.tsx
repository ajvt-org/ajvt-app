"use client";

import { useState } from "react";
import ConfirmDialogShell from "@/components/ConfirmDialogShell";
import IconLabel from "@/components/IconLabel";
import Notice from "@/components/Notice";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/clubTime";
import { membershipEnding as texts, MEMBERSHIP_ENDING_REASONS } from "@/lib/texts";
import { MAX_ENDING_REASON } from "@/lib/membershipEnding";
import type { BroughtBackEnding } from "@/lib/membershipEndingHistory";

const WRITTEN = "";

export interface Ended {
  endedAt: string;
  endedReason: string | null;
  endedBy: string | null;
}

export function EndedRows({ endedAt, endedReason, endedBy }: Ended) {
  return (
    <>
      <Row label={texts.endedReason} value={endedReason ?? "—"} />
      <Row label={texts.endedOn} value={<bdi dir="ltr">{formatDate(endedAt)}</bdi>} />
      <Row label={texts.endedBy} value={endedBy ?? "—"} />
    </>
  );
}

export function BroughtBackEndings({ endings }: { endings: BroughtBackEnding[] }) {
  if (endings.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
        {texts.broughtBack}
      </p>
      {endings.map((ending) => (
        <dl
          key={`${ending.endedAt}-${ending.restoredAt}`}
          className="text-xs space-y-1 px-2.5 py-2 rounded-lg"
          style={{ background: "white", border: "1px solid var(--mint-100)" }}
        >
          <Row label={texts.endedReason} value={ending.reason ?? "—"} />
          <Row label={texts.endedOn} value={<bdi dir="ltr">{formatDate(ending.endedAt)}</bdi>} />
          <Row label={texts.endedBy} value={ending.endedBy ?? "—"} />
          <Row
            label={texts.restoredOn}
            value={<bdi dir="ltr">{formatDate(ending.restoredAt)}</bdi>}
          />
          <Row label={texts.restoredBy} value={ending.restoredBy ?? "—"} />
        </dl>
      ))}
    </div>
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
  ending,
  onChanged,
}: {
  memberId: string;
  memberName: string;
  year: number;
  ending: Ended | null;
  onChanged: () => void;
}) {
  const [asking, setAsking] = useState<"end" | "restore" | null>(null);
  const [reason, setReason] = useState<string>(MEMBERSHIP_ENDING_REASONS[0]);
  const [written, setWritten] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() {
    setAsking(null);
    setError("");
  }

  async function run(call: Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await call;
      setAsking(null);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const picked = reason === WRITTEN ? written.trim() : reason;
  const notice = error ? <Notice tone="error">{error}</Notice> : null;

  return (
    <>
      {ending ? (
        <button
          onClick={() => setAsking("restore")}
          disabled={busy}
          className="btn btn-sm btn-ghost font-bold"
        >
          <IconLabel name="refresh">{texts.restore}</IconLabel>
        </button>
      ) : (
        <button
          onClick={() => setAsking("end")}
          disabled={busy}
          className="btn btn-sm btn-danger font-bold"
        >
          <IconLabel name="ban">{texts.end}</IconLabel>
        </button>
      )}

      {!asking && notice}

      {asking === "end" && (
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
              <option value={WRITTEN}>{texts.otherReason}</option>
            </select>
          </div>

          {reason === WRITTEN && (
            <div className="space-y-2">
              <label className="block text-xs font-bold" htmlFor="ending-reason-written">
                {texts.writtenLabel}
              </label>
              <input
                id="ending-reason-written"
                value={written}
                onChange={(e) => setWritten(e.target.value)}
                maxLength={MAX_ENDING_REASON}
                className="input text-sm"
              />
            </div>
          )}

          <button
            onClick={() =>
              run(api.post(`/api/admin/members/${memberId}/end-membership`, { reason: picked }))
            }
            disabled={busy || picked.length === 0}
            className="btn btn-danger w-full text-sm font-bold disabled:opacity-40"
          >
            {busy ? "..." : texts.endConfirm}
          </button>

          {notice}
        </ConfirmDialogShell>
      )}

      {asking === "restore" && ending && (
        <ConfirmDialogShell title={texts.restoreTitle} onClose={close}>
          <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            {texts.restoreSubject(memberName, year)}
          </p>

          <div className="space-y-1">
            <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
              {texts.restoreUndoes}
            </p>
            <dl className="text-sm space-y-1">
              <EndedRows {...ending} />
            </dl>
          </div>

          <button
            onClick={() => run(api.del(`/api/admin/members/${memberId}/end-membership`))}
            disabled={busy}
            className="btn w-full text-sm font-bold disabled:opacity-40"
            style={{ background: "var(--mint-600)", color: "white" }}
          >
            {busy ? "..." : texts.restoreConfirm}
          </button>

          {notice}
        </ConfirmDialogShell>
      )}
    </>
  );
}
