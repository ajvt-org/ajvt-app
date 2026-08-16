"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { api, errorMessage } from "@/lib/api";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";

// Deciding on the file rather than back on the list. The file is what an admin
// opens to answer "should this one be accepted", and until now it could show
// the proof, the history and the payment without being able to say yes or no.
export default function MemberDecision({
  memberId,
  status,
  onDecided,
}: {
  memberId: string;
  status: string;
  onDecided: () => void;
}) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [reason, setReason] = useState<string>(REJECTION_REASONS[0]);
  const [busy, setBusy] = useState(false);
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

  async function remove() {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    setBusy(true);
    setError("");
    try {
      await api.del(`/api/admin/members/${memberId}`);
      router.push("/admin/dashboard");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
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
              // Full width only when it sits beside the accept button. Alone on
              // an accepted member's file, a wide red bar reads as the thing to
              // press, which it is not.
              className={`btn text-sm ${status === "PENDING" ? "flex-1" : ""}`}
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              <IconLabel name="close">رفض</IconLabel>
            </button>
          )}
          <button
            onClick={remove}
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
    </div>
  );
}
