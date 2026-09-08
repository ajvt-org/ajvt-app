"use client";

import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
import { counted } from "@/lib/arabicCount";
import { RESULT } from "@/lib/messages";
import { filterSheet as texts } from "@/lib/texts";

export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      {children}
    </div>
  );
}

export default function FilterSheetShell({
  activeCount,
  resultCount,
  onClear,
  onClose,
  children,
}: {
  activeCount: number;
  resultCount: number;
  onClear: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
        style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
      >
        <DialogHeader title={texts.title} onClose={onClose} />

        <div className="p-5 space-y-4">
          {children}

          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs flex-1" style={{ color: "var(--text-muted)" }}>
              {counted(resultCount, RESULT)}
            </span>
            {activeCount > 0 && (
              <button
                onClick={onClear}
                className="btn btn-sm"
                style={{
                  background: "white",
                  color: "var(--mint-700)",
                  border: "1px solid var(--mint-100)",
                }}
              >
                <IconLabel name="close">{texts.clear}</IconLabel>
              </button>
            )}
            <button onClick={onClose} className="btn btn-primary btn-sm">
              {texts.done}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
