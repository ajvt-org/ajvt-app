"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import Notice from "@/components/Notice";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";
import MemberProofForm from "@/components/admin/MemberProofForm";
import { api, errorMessage } from "@/lib/api";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import { deleteMember, memberDecision as texts } from "@/lib/texts";
import PaymentActions from "./PaymentActions";
import { DANGER, DANGER_OUTLINE, QUIET } from "./donationTones";

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
    <div className="space-y-2">
      {picking ? (
        <div className="space-y-2 pt-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
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
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => decide("REJECTED", reason)}
              disabled={busy}
              className="btn btn-sm font-bold"
              style={DANGER}
            >
              {busy ? texts.busy : texts.confirmRefuse}
            </button>
            <button onClick={() => setPicking(false)} className="btn btn-sm" style={QUIET}>
              {texts.cancel}
            </button>
          </div>
        </div>
      ) : (
        <PaymentActions
          danger={
            <button
              onClick={() => setConfirming(true)}
              disabled={busy}
              className="btn btn-sm font-bold"
              style={DANGER_OUTLINE}
            >
              <IconLabel name="trash">{deleteMember.payment}</IconLabel>
            </button>
          }
        >
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
              style={DANGER}
            >
              <IconLabel name="close">{texts.refuse}</IconLabel>
            </button>
          )}
          <MemberProofForm memberId={userId} proof={proof} onSaved={onChanged} />
        </PaymentActions>
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
