"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";

const PAYMENT_METHODS = ["بنكيلي", "السداد", "مصرفي"];

const PAYMENT_CODES: Record<string, string> = {
  بنكيلي: "027217",
  السداد: "08493",
  مصرفي: "037940",
};

export default function PaymentInfoBanner({ note }: { note?: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "linear-gradient(135deg, var(--mint-700), var(--mint-800))",
        border: "1px solid var(--copper-400)",
      }}
    >
      <p className="text-sm font-bold mb-3 text-white">
        <IconLabel name="card">معلومات الدفع</IconLabel>
      </p>
      <div className="space-y-2">
        {PAYMENT_METHODS.map((method) => (
          <div
            key={method}
            className="flex items-center justify-between rounded-xl px-3 py-2"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <span className="text-sm font-semibold text-white">{method}</span>
            <div className="flex items-center gap-2">
              <span
                className="font-mono font-bold text-sm"
                style={{ color: "var(--mint-200)" }}
                dir="ltr"
              >
                {PAYMENT_CODES[method]}
              </span>
              <button
                type="button"
                onClick={() => copyCode(PAYMENT_CODES[method])}
                className="text-xs px-2 py-1 rounded-lg font-bold transition-all"
                style={{
                  background:
                    copied === PAYMENT_CODES[method]
                      ? "rgba(52,211,153,0.3)"
                      : "rgba(255,255,255,0.15)",
                  color: copied === PAYMENT_CODES[method] ? "#6ee7b7" : "white",
                  border: "1px solid rgba(255,255,255,0.2)",
                  minWidth: "52px",
                }}
              >
                {copied === PAYMENT_CODES[method] ? <IconLabel name="check">تم</IconLabel> : "نسخ"}
              </button>
            </div>
          </div>
        ))}
      </div>
      {note && (
        <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.75)" }}>
          {note}
        </p>
      )}
    </div>
  );
}
