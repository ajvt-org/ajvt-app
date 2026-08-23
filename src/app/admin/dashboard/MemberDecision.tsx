"use client";

import IconLabel from "@/components/IconLabel";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import type { Member } from "./types";

function RejectPicker({
  reason,
  loading,
  onReason,
  onCancel,
  onConfirm,
}: {
  reason: string;
  loading: boolean;
  onReason: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="card p-3 space-y-2.5" style={{ background: "var(--mint-50)" }}>
      <label
        className="block text-xs font-bold"
        style={{ color: "var(--text-main)" }}
        htmlFor="dash-field-3"
      >
        سبب الرفض — سيظهر للعضو (أو اضغط رقم 1-{REJECTION_REASONS.length} مباشرة)
      </label>
      <select
        id="dash-field-3"
        value={reason}
        onChange={(e) => onReason(e.target.value)}
        className="input text-sm"
      >
        {REJECTION_REASONS.map((r, i) => (
          <option key={r} value={r}>
            {i + 1}. {r}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={loading}
          className="btn text-sm"
          style={{
            background: "white",
            color: "var(--text-muted)",
            border: "1px solid var(--mint-200)",
          }}
        >
          إلغاء
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="btn text-sm font-bold flex-1"
          style={{ background: "#dc2626", color: "white" }}
        >
          {loading ? "..." : "تأكيد الرفض"}
        </button>
      </div>
    </div>
  );
}

export default function MemberDecision({
  member,
  loading,
  showRejectPicker,
  rejectReason,
  onRejectReason,
  onOpenRejectPicker,
  onCloseRejectPicker,
  onApprove,
  onReject,
}: {
  member: Member;
  loading: boolean;
  showRejectPicker: boolean;
  rejectReason: string;
  onRejectReason: (reason: string) => void;
  onOpenRejectPicker: () => void;
  onCloseRejectPicker: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const decidable = member.status === "PENDING" || member.status === "ACTIVE";

  return (
    <>
      {decidable && (
        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          <IconLabel name="list">اختصارات: A قبول — R رفض — N التالي</IconLabel>
        </p>
      )}

      {member.status === "PENDING" && !showRejectPicker && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onApprove} disabled={loading} className="btn btn-primary text-sm">
            {loading ? "..." : <IconLabel name="check">قبول</IconLabel>}
          </button>
          <button
            onClick={onOpenRejectPicker}
            disabled={loading}
            className="btn text-sm font-bold"
            style={{ background: "#dc2626", color: "white" }}
          >
            <IconLabel name="close">رفض</IconLabel>
          </button>
        </div>
      )}

      {member.status === "ACTIVE" && !showRejectPicker && (
        <button
          onClick={onOpenRejectPicker}
          disabled={loading}
          className="btn w-full text-sm font-bold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          تغيير إلى مرفوض
        </button>
      )}

      {decidable && showRejectPicker && (
        <RejectPicker
          reason={rejectReason}
          loading={loading}
          onReason={onRejectReason}
          onCancel={onCloseRejectPicker}
          onConfirm={onReject}
        />
      )}

      {member.status === "REJECTED" && (
        <>
          {member.rejectionReason && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              سبب الرفض: <span className="font-bold">{member.rejectionReason}</span>
            </p>
          )}
          <button onClick={onApprove} disabled={loading} className="btn btn-primary w-full text-sm">
            {loading ? "..." : "تغيير إلى معتمد"}
          </button>
        </>
      )}
    </>
  );
}
