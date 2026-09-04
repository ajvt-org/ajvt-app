"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import { usePayableMethods } from "@/lib/usePayableMethods";

const ROW = "flex items-center justify-between rounded-xl px-3 py-2";
const ROW_BACKGROUND = { background: "rgba(255,255,255,0.1)" };

async function toClipboard(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    return;
  } catch {
    const el = document.createElement("textarea");
    el.value = code;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

function Bar({ width }: { width: string }) {
  return (
    <span
      className="rounded-lg"
      style={{ height: 16, width, background: "rgba(255,255,255,0.25)" }}
    />
  );
}

function Waiting() {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <div key={row} className={`${ROW} pulse`} style={ROW_BACKGROUND} aria-hidden="true">
          <Bar width="5rem" />
          <Bar width="6rem" />
        </div>
      ))}
    </>
  );
}

function Notice({ children }: { children: string }) {
  return (
    <p className="text-sm py-2" style={{ color: "rgba(255,255,255,0.85)" }}>
      {children}
    </p>
  );
}

function MethodRow({
  name,
  code,
  copied,
  onCopy,
}: {
  name: string;
  code: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className={ROW} style={ROW_BACKGROUND}>
      <span className="text-sm font-semibold text-white">{name}</span>
      <div className="flex items-center gap-2">
        <span
          className="font-mono font-bold text-sm"
          style={{ color: "var(--mint-200)" }}
          dir="ltr"
        >
          {code}
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

export default function PaymentInfoBanner({ note }: { note?: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const { methods, loading, failed } = usePayableMethods();

  async function copyCode(code: string) {
    await toClipboard(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
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
        {loading && <Waiting />}
        {!loading && failed && <Notice>تعذر تحميل أرقام الدفع، أعد تحميل الصفحة</Notice>}
        {!loading && !failed && methods.length === 0 && (
          <Notice>لا توجد طريقة دفع متاحة حالياً</Notice>
        )}
        {methods.map((method) => (
          <MethodRow
            key={method.name}
            name={method.name}
            code={method.accounts[0].code}
            copied={copied === method.accounts[0].code}
            onCopy={() => copyCode(method.accounts[0].code)}
          />
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
