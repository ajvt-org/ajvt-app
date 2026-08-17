"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { api, errorMessage } from "@/lib/api";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";

export default function MemberDecision({
  memberId,
  fullName,
  status,
  onDecided,
}: {
  memberId: string;
  fullName: string;
  status: string;
  onDecided: () => void;
}) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [reason, setReason] = useState<string>(REJECTION_REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function decide(action: "ACTIVE" | "REJECTED", rejectionReason?: string) {
    setBusy(true);
    setError("");
    try {
      await api.post("/api/admin/validate", {
        id: memberId,
        action,
        ...(rejectionReason ? { rejectionReason } : {}),
      });
      setPicking(false);
      onDecided();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(confirmName: string) {
    setBusy(true);
    setError("");
    try {
      await api.del(`/api/admin/members/${memberId}`, { confirmName });
      router.push("/admin/dashboard");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="card p-4 space-y-3">
      {picking ? (
        <>
          <label className="block text-xs font-bold" htmlFor="decide-reason">
            سبب الرفض
          </label>
          <select
            id="decide-reason"
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
              {busy ? "..." : "تأكيد الرفض"}
            </button>
            <button
              onClick={() => setPicking(false)}
              className="btn text-sm"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              إلغاء
            </button>
          </div>
        </>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {status !== "ACTIVE" && (
            <button
              onClick={() => decide("ACTIVE")}
              disabled={busy}
              className="btn btn-primary text-sm flex-1"
            >
              {busy ? "..." : <IconLabel name="check">قبول</IconLabel>}
            </button>
          )}
          {status !== "REJECTED" && (
            <button
              onClick={() => setPicking(true)}
              disabled={busy}
              className={`btn text-sm ${status === "PENDING" ? "flex-1" : ""}`}
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              <IconLabel name="close">رفض</IconLabel>
            </button>
          )}
          <button
            onClick={() => setConfirming(true)}
            disabled={busy}
            className="btn text-sm"
            style={{ background: "transparent", color: "var(--text-muted)" }}
          >
            <IconLabel name="trash">حذف</IconLabel>
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}

      {confirming && (
        <ConfirmDeleteDialog
          name={fullName}
          loading={busy}
          onConfirm={remove}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
