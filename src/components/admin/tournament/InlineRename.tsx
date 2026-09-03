"use client";

import { useState } from "react";
import { teamsTab } from "@/lib/texts";

export default function InlineRename({
  value,
  maxLength,
  busy,
  onSave,
  onCancel,
}: {
  value: string;
  maxLength: number;
  busy: boolean;
  onSave: (next: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={maxLength}
        className="input text-sm flex-1 min-w-0"
        autoFocus
      />
      <button
        onClick={() => onSave(draft)}
        disabled={busy || !draft.trim()}
        className="text-xs px-2 py-1 rounded-lg font-bold shrink-0"
        style={{ background: "var(--mint-600)", color: "white" }}
      >
        {teamsTab.save}
      </button>
      <button
        onClick={onCancel}
        className="text-xs px-2 py-1 rounded-lg font-bold shrink-0"
        style={{
          background: "white",
          color: "var(--text-muted)",
          border: "1px solid var(--mint-200)",
        }}
      >
        {teamsTab.cancel}
      </button>
    </div>
  );
}
