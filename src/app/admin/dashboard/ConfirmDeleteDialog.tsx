"use client";

import { useState } from "react";
import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
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
    <div
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl"
        style={{ background: "var(--mint-50)", direction: "rtl" }}
      >
        <DialogHeader title={<IconLabel name="warning">حذف نهائي</IconLabel>} onClose={onClose} />

        <div className="p-5 space-y-4">
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

          <button
            onClick={onClose}
            className="btn w-full text-sm"
            style={{
              background: "white",
              color: "var(--text-muted)",
              border: "1px solid var(--mint-200)",
            }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
