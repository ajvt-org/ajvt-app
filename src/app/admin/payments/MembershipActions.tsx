"use client";

import { useState } from "react";
import Notice from "@/components/Notice";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";
import MemberProofButton from "@/components/admin/MemberProofButton";
import MemberProofPanel from "@/components/admin/MemberProofPanel";
import VerbButton from "@/components/admin/VerbButton";
import { GRAVE, LEAD, RISKY } from "@/components/admin/verbTones";
import { api, errorMessage } from "@/lib/api";
import { deleteMember, memberDecision as texts } from "@/lib/texts";
import PaymentActions from "./PaymentActions";
import RefusalPicker, { type RefusalMode } from "./RefusalPicker";

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
  const [picking, setPicking] = useState<RefusalMode | null>(null);
  const [editingProof, setEditingProof] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(call: Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await call;
      setPicking(null);
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
        <RefusalPicker
          id={userId}
          mode={picking}
          busy={busy}
          onConfirm={(reason) => decide("REJECTED", reason)}
          onCancel={() => setPicking(null)}
        />
      ) : (
        <>
          <PaymentActions
            danger={
              <>
                {status === "ACTIVE" && (
                  <VerbButton
                    icon="ban"
                    label={texts.revoke}
                    tone={RISKY}
                    disabled={busy}
                    onClick={() => setPicking("revoke")}
                  />
                )}
                <VerbButton
                  icon="trash"
                  label={deleteMember.payment}
                  tone={GRAVE}
                  disabled={busy}
                  onClick={() => setConfirming(true)}
                />
              </>
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
            {status === "PENDING" && (
              <VerbButton
                icon="close"
                label={texts.refuse}
                tone={RISKY}
                disabled={busy}
                onClick={() => setPicking("refuse")}
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
