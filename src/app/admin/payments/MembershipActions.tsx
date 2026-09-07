"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import Notice from "@/components/Notice";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";
import MemberProofForm from "@/components/admin/MemberProofForm";
import { api, errorMessage } from "@/lib/api";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import { deleteMember, memberDecision as texts } from "@/lib/texts";

export default function MembershipActions({
  userId,
  memberName,
  proof,
  status,
  onChanged,
}: {
  userId: string;
  memberName: string;
  proof: string | null;
  status: string;
  onChanged: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const [reason, setReason] = useState<string>(REJECTION_REASONS[0]);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(call: Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await call;
      setPicking(false);
      setConfirming(false);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  function decide(action: "ACTIVE" | "REJECTED", rejectionReason?: string) {
    return run(
      api.post("/api/admin/validate", {
        id: userId,
        action,
        ...(rejectionReason ? { rejectionReason } : {}),
      }),
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {picking ? (
        <>
          <label className="block text-xs font-bold" htmlFor={`refuse-reason-${userId}`}>
            {texts.reasonLabel}
          </label>
          <select
            id={`refuse-reason-${userId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input text-sm"
          >
            {REJECTION_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => decide("REJECTED", reason)}
              disabled={busy}
              className="btn text-sm flex-1"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              {busy ? texts.busy : texts.confirmRefuse}
            </button>
            <button
              onClick={() => setPicking(false)}
              className="btn text-sm"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              {texts.cancel}
            </button>
          </div>
        </>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {status !== "ACTIVE" && (
            <button
              onClick={() => decide("ACTIVE")}
              disabled={busy}
              className="btn btn-sm btn-primary font-bold"
            >
              {busy ? texts.busy : <IconLabel name="check">{texts.accept}</IconLabel>}
            </button>
          )}
          {status !== "REJECTED" && (
            <button
              onClick={() => setPicking(true)}
              disabled={busy}
              className="btn btn-sm font-bold"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              <IconLabel name="close">{texts.refuse}</IconLabel>
            </button>
          )}
          <MemberProofForm memberId={userId} proof={proof} onSaved={onChanged} />
          <button
            onClick={() => setConfirming(true)}
            disabled={busy}
            className="btn btn-sm font-bold"
            style={{ background: "white", color: "#991b1b", border: "1.5px solid #fca5a5" }}
          >
            <IconLabel name="trash">{deleteMember.payment}</IconLabel>
          </button>
        </div>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      {confirming && (
        <ConfirmDeleteDialog
          name={memberName}
          consequence={deleteMember.paymentConsequence(memberName)}
          loading={busy}
          onConfirm={(confirmName) => run(api.del(`/api/admin/members/${userId}`, { confirmName }))}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
