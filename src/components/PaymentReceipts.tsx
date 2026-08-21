"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import { formatDate } from "@/lib/utils";
import { receiptFilename, receiptReference, receiptTitle, type ReceiptRow } from "@/lib/receipts";

function Receipt({ row, innerRef }: { row: ReceiptRow; innerRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={innerRef} className="p-5" style={{ background: "var(--mint-100)" }}>
      <p className="text-xs" style={{ color: "var(--mint-700)" }}>
        رابطة شباب التاكلالت
      </p>
      <p className="text-sm font-bold mt-1" style={{ color: "var(--text-main)" }}>
        {receiptTitle(row)}
      </p>
      <p className="text-3xl font-black mt-2" style={{ color: "var(--text-main)" }}>
        {row.amount} أوقية
      </p>
      <div className="text-xs mt-3 flex flex-col gap-0.5" style={{ color: "var(--text-muted)" }}>
        <span>{row.payerName}</span>
        {row.memberNumber && <span>رقم العضوية {row.memberNumber}</span>}
        <span>{formatDate(row.paidAt)}</span>
        <span>مرجع الوصل {receiptReference(row)}</span>
      </div>
    </div>
  );
}

export default function PaymentReceipts() {
  const [rows, setRows] = useState<ReceiptRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    let alive = true;
    api
      .get<{ receipts: ReceiptRow[] }>("/api/user/receipts")
      .then((data) => {
        if (alive) setRows(data.receipts);
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function share(row: ReceiptRow) {
    const node = refs.current.get(row.id);
    if (!node) return;
    setBusy(row.id);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(node, { backgroundColor: null, scale: 2 });
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;

      const name = receiptFilename(row);
      const file = new File([blob], name, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: receiptTitle(row) });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") console.error("Receipt error:", err);
    } finally {
      setBusy(null);
    }
  }

  if (!rows || rows.length === 0) return null;

  return (
    <div className="card p-5 overflow-hidden">
      <h3
        className="font-bold mb-3 pb-2"
        style={{ color: "var(--text-main)", borderBottom: "1px solid var(--mint-100)" }}
      >
        <IconLabel name="receipt">وصولات الدفع</IconLabel>
      </h3>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl overflow-hidden">
            <Receipt
              row={row}
              innerRef={(node) => {
                if (node) refs.current.set(row.id, node);
                else refs.current.delete(row.id);
              }}
            />
            <button
              className="btn w-full mt-2"
              disabled={busy === row.id}
              onClick={() => share(row)}
            >
              <IconLabel name="download">حفظ الوصل</IconLabel>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
