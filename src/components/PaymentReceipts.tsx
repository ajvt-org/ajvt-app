"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import { ReceiptCard } from "@/components/receipt/ReceiptSheet";
import { savePdf, sharePng } from "@/components/pdf/renderPdf";
import { receiptFileName, type OfficialReceiptView } from "@/lib/officialReceipt";
import { memberReceipts } from "@/lib/texts/receipt";

export default function PaymentReceipts({ source = "/api/user/receipts" }: { source?: string }) {
  const [rows, setRows] = useState<OfficialReceiptView[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    let alive = true;
    api
      .get<{ receipts: OfficialReceiptView[] }>(source)
      .then((data) => {
        if (alive) setRows(data.receipts);
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, [source]);

  async function run(receipt: OfficialReceiptView, action: (node: HTMLElement) => Promise<void>) {
    const node = refs.current.get(receipt.number);
    if (!node) return;
    setBusy(receipt.number);
    try {
      await action(node);
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
        <IconLabel name="receipt">{memberReceipts.title}</IconLabel>
      </h3>
      <div className="flex flex-col gap-4">
        {rows.map((receipt) => (
          <div key={receipt.number} className="rounded-xl overflow-hidden">
            <div style={{ overflowX: "auto" }}>
              <ReceiptCard
                receipt={receipt}
                innerRef={(node) => {
                  if (node) refs.current.set(receipt.number, node);
                  else refs.current.delete(receipt.number);
                }}
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                className="btn flex-1"
                disabled={busy === receipt.number}
                onClick={() =>
                  run(receipt, (node) => savePdf(node, receiptFileName(receipt.number, "pdf")))
                }
              >
                <IconLabel name="file">{memberReceipts.pdf}</IconLabel>
              </button>
              <button
                className="btn flex-1"
                disabled={busy === receipt.number}
                onClick={() =>
                  run(receipt, (node) =>
                    sharePng(node, receiptFileName(receipt.number, "png"), memberReceipts.title),
                  )
                }
              >
                <IconLabel name="upload">{memberReceipts.share}</IconLabel>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
