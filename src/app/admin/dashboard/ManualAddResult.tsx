"use client";

import IconLabel from "@/components/IconLabel";
import { manualAdd } from "@/lib/texts";

export default function ManualAddResult({
  tempPassword,
  onAddAnother,
}: {
  tempPassword?: string;
  onAddAnother: () => void;
}) {
  return (
    <div className="space-y-3">
      <div
        className="p-3 rounded-xl text-sm font-semibold"
        style={{ background: "#d1fae5", color: "#065f46" }}
      >
        <IconLabel name="check">{manualAdd.created}</IconLabel>
      </div>
      {tempPassword && (
        <div
          className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
          style={{ background: "white", border: "1px solid var(--mint-200)" }}
        >
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
              {manualAdd.tempPasswordNote}
            </p>
            <p
              className="font-mono font-black text-lg"
              style={{ color: "var(--mint-700)" }}
              dir="ltr"
            >
              {tempPassword}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(tempPassword)}
            className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
            style={{ background: "var(--mint-600)", color: "white" }}
          >
            {manualAdd.copy}
          </button>
        </div>
      )}
      <button onClick={onAddAnother} className="btn btn-primary text-sm">
        {manualAdd.addAnother}
      </button>
    </div>
  );
}
