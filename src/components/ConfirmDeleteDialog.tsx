"use client";

import { useState } from "react";
import ConfirmDialogShell from "./ConfirmDialogShell";
import { confirmationMatches } from "@/lib/deletedRecords";
import { confirmDelete as texts } from "@/lib/texts";

export default function ConfirmDeleteDialog({
  name,
  consequence,
  loading,
  onConfirm,
  onClose,
}: {
  name: string;
  consequence: string;
  loading: boolean;
  onConfirm: (confirmName: string) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState("");
  const matches = confirmationMatches(typed, name);

  return (
    <ConfirmDialogShell title={texts.title} onClose={onClose}>
      {step === 1 ? (
        <>
          <p className="text-sm" style={{ color: "var(--text-main)" }}>
            {consequence}
          </p>
          <button
            onClick={() => setStep(2)}
            className="btn w-full text-sm font-bold"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            {texts.proceed}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm" style={{ color: "var(--text-main)" }}>
            {texts.typeToConfirm(name)}
          </p>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="input text-sm"
            autoFocus
            aria-label={texts.nameField}
          />
          <button
            onClick={() => onConfirm(typed)}
            disabled={!matches || loading}
            className="btn w-full text-sm font-bold disabled:opacity-40"
            style={{ background: "#dc2626", color: "white" }}
          >
            {loading ? "..." : texts.confirm}
          </button>
        </>
      )}
    </ConfirmDialogShell>
  );
}
