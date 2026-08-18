"use client";

import { useState } from "react";
import ConfirmDialogShell from "./ConfirmDialogShell";
import { confirmationMatches, RETENTION_DAYS } from "@/lib/deletedRecords";

export default function ConfirmDeleteDialog({
  name,
  loading,
  onConfirm,
  onClose,
}: {
  name: string;
  loading: boolean;
  onConfirm: (confirmName: string) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState("");
  const matches = confirmationMatches(typed, name);

  return (
    <ConfirmDialogShell title="حذف نهائي" onClose={onClose}>
      {step === 1 ? (
        <>
          <p className="text-sm" style={{ color: "var(--text-main)" }}>
            سيُحذف <span className="font-bold">{name}</span> من القائمة.
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            يمكن استرجاعه خلال {RETENTION_DAYS} يوماً، وبعدها يُمحى نهائياً.
          </p>
          <button
            onClick={() => setStep(2)}
            className="btn w-full text-sm font-bold"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            متابعة
          </button>
        </>
      ) : (
        <>
          <p className="text-sm" style={{ color: "var(--text-main)" }}>
            اكتب <span className="font-bold">{name}</span> للتأكيد.
          </p>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="input text-sm"
            autoFocus
            aria-label="اسم العضو للتأكيد"
          />
          <button
            onClick={() => onConfirm(typed)}
            disabled={!matches || loading}
            className="btn w-full text-sm font-bold disabled:opacity-40"
            style={{ background: "#dc2626", color: "white" }}
          >
            {loading ? "..." : "حذف نهائي"}
          </button>
        </>
      )}
    </ConfirmDialogShell>
  );
}
