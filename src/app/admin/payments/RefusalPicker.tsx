"use client";

import { useState } from "react";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import { memberDecision as texts } from "@/lib/texts";
import { DANGER, QUIET } from "./donationTones";

export type RefusalMode = "refuse" | "revoke";

const WORDS = {
  refuse: { reason: texts.reasonLabel, confirm: texts.confirmRefuse },
  revoke: { reason: texts.revokeReasonLabel, confirm: texts.confirmRevoke },
} as const;

export default function RefusalPicker({
  id,
  mode,
  busy,
  onConfirm,
  onCancel,
}: {
  id: string;
  mode: RefusalMode;
  busy: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<string>(REJECTION_REASONS[0]);
  const words = WORDS[mode];
  const fieldId = `refuse-reason-${id}`;

  return (
    <div className="space-y-2 pt-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
      <label className="block text-xs font-bold" htmlFor={fieldId}>
        {words.reason}
      </label>
      <select
        id={fieldId}
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
          onClick={() => onConfirm(reason)}
          disabled={busy}
          className="btn btn-sm font-bold"
          style={DANGER}
        >
          {busy ? texts.busy : words.confirm}
        </button>
        <button onClick={onCancel} className="btn btn-sm" style={QUIET}>
          {texts.cancel}
        </button>
      </div>
    </div>
  );
}
