"use client";

import IconLabel from "@/components/IconLabel";

export default function RandomSend({
  count,
  fallback,
  sending,
  onCount,
  onSend,
}: {
  count: string;
  fallback: number;
  sending: boolean;
  onCount: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="card p-4 space-y-2">
      <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
        <IconLabel name="upload">
          إرسال دفعة عشوائية (سؤال مختلف محتمل لكل مستخدم، بدون تكرار)
        </IconLabel>
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          dir="ltr"
          min={1}
          placeholder={`العدد (افتراضي: ${fallback})`}
          className="input text-sm"
          value={count}
          onChange={(e) => onCount(e.target.value)}
          aria-label="عدد الأسئلة"
        />
        <button
          onClick={onSend}
          disabled={sending}
          className="text-xs px-4 py-2 rounded-lg font-bold shrink-0"
          style={{ background: "var(--copper-500)", color: "white" }}
        >
          {sending ? "..." : "إرسال عشوائي"}
        </button>
      </div>
    </div>
  );
}
