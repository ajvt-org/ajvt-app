"use client";

import IconLabel from "@/components/IconLabel";

export default function CopyRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: React.ReactNode;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-3 py-2"
      style={{ background: "rgba(255,255,255,0.1)" }}
    >
      <span className="text-sm font-semibold text-white">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className="font-mono font-bold text-sm"
          style={{ color: "var(--mint-200)" }}
          dir="ltr"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="text-xs px-2 py-1 rounded-lg font-bold transition-all"
          style={{
            background: copied ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.15)",
            color: copied ? "#6ee7b7" : "white",
            border: "1px solid rgba(255,255,255,0.2)",
            minWidth: "52px",
          }}
        >
          {copied ? <IconLabel name="check">تم</IconLabel> : "نسخ"}
        </button>
      </div>
    </div>
  );
}
