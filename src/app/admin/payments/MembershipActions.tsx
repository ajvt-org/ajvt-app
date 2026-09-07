"use client";

import { useState } from "react";
import Notice from "@/components/Notice";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";
import MemberProofButton from "@/components/admin/MemberProofButton";
import MemberProofPanel from "@/components/admin/MemberProofPanel";
import VerbButton from "@/components/admin/VerbButton";
import { GRAVE, LEAD, RISKY } from "@/components/admin/verbTones";
import { api, errorMessage } from "@/lib/api";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import { deleteMember, memberDecision as texts } from "@/lib/texts";
import PaymentActions from "./PaymentActions";
import { DANGER, QUIET } from "./donationTones";

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
  const [editingProof, setEditingProof] = useState(false);
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
        <>
          <PaymentActions
            danger={
              <VerbButton
                icon="trash"
                label={deleteMember.payment}
                tone={GRAVE}
                disabled={busy}
                onClick={() => setConfirming(true)}
              />
            }
          >
            {status !== "ACTIVE" && (
              <VerbButton
                icon="check"
                label={texts.accept}
                tone={LEAD}
                disabled={busy}
                onClick={() => decide("ACTIVE")}
              />
            )}
            {status !== "REJECTED" && (
              <VerbButton
                icon="close"
                label={texts.refuse}
                tone={RISKY}
                disabled={busy}
                onClick={() => setPicking(true)}
              />
            )}
            <MemberProofButton proof={proof} onClick={() => setEditingProof(true)} />
          </PaymentActions>

          {editingProof && (
            <MemberProofPanel
              memberId={userId}
              proof={proof}
              onSaved={onChanged}
              onClose={() => setEditingProof(false)}
            />
          )}
        </>
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
