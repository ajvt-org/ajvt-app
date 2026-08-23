"use client";

import { hoursLabel } from "@/lib/arabicPlural";

export default function TempPasswordBox({ value, hours }: { value: string; hours: number }) {
  return (
    <div
      className="mt-3 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
      style={{ background: "var(--mint-50)", border: "1px solid var(--mint-200)" }}
    >
      <div>
        <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
          كلمة المرور المؤقتة — سلّمها للعضو
        </p>
        <p className="font-mono font-black text-lg" style={{ color: "var(--mint-700)" }} dir="ltr">
          {value}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          صالحة {hoursLabel(hours)}، وسيُطلب منه تغييرها عند الدخول
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(value)}
        className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
        style={{ background: "var(--mint-600)", color: "white" }}
      >
        نسخ
      </button>
    </div>
  );
}
