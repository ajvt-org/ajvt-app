"use client";

import IconLabel from "@/components/IconLabel";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import type { AgeGroup } from "./types";
import { counted } from "@/lib/arabicCount";
import { MEMBER } from "@/lib/messages";

const CHIP = "text-xs px-3 py-1.5 rounded-lg font-bold";

export default function BulkActionsBar({
  count,
  pending,
  loading,
  reason,
  age,
  ageGroups,
  onReason,
  onAge,
  onClear,
  onApprove,
  onReject,
  onMoveAge,
}: {
  count: number;
  pending: boolean;
  loading: boolean;
  reason: string;
  age: string;
  ageGroups: AgeGroup[];
  onReason: (reason: string) => void;
  onAge: (age: string) => void;
  onClear: () => void;
  onApprove: () => void;
  onReject: () => void;
  onMoveAge: () => void;
}) {
  return (
    <div
      className="card p-3 mb-3 space-y-2"
      style={{ background: "var(--mint-50)", border: "1px solid var(--mint-300)" }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          تم تحديد {counted(count, MEMBER)}
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onClear}
            className={CHIP}
            style={{
              background: "white",
              color: "var(--text-muted)",
              border: "1px solid var(--mint-200)",
            }}
          >
            إلغاء
          </button>
          {pending && (
            <>
              <button
                onClick={onReject}
                disabled={loading}
                className={CHIP}
                style={{ background: "#fee2e2", color: "#991b1b" }}
              >
                {loading ? "..." : <IconLabel name="close">رفض الكل</IconLabel>}
              </button>
              <button
                onClick={onApprove}
                disabled={loading}
                className={CHIP}
                style={{ background: "var(--mint-600)", color: "white" }}
              >
                {loading ? "..." : <IconLabel name="check">قبول الكل ({count})</IconLabel>}
              </button>
            </>
          )}
        </div>
      </div>

      {pending && (
        <div className="flex items-center gap-2">
          <label
            htmlFor="bulk-reason"
            className="text-xs font-bold shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            سبب رفض الدفع
          </label>
          <select
            id="bulk-reason"
            value={reason}
            onChange={(e) => onReason(e.target.value)}
            className="input text-xs flex-1 min-w-0"
          >
            {REJECTION_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <label
          htmlFor="bulk-age"
          className="text-xs font-bold shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          نقل إلى عصر
        </label>
        <select
          id="bulk-age"
          value={age}
          onChange={(e) => onAge(e.target.value)}
          className="input text-xs flex-1 min-w-0"
        >
          <option value="">اختر العصر</option>
          {ageGroups.map((g) => (
            <option key={g.id} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>
        <button
          onClick={onMoveAge}
          disabled={loading || !age}
          className={`${CHIP} shrink-0 disabled:opacity-40`}
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          {loading ? "..." : <IconLabel name="check">نقل ({count})</IconLabel>}
        </button>
      </div>
    </div>
  );
}
