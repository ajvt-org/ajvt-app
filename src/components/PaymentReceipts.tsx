"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import ReceiptCard from "@/components/receipt/ReceiptCard";
import ReceiptFit from "@/components/receipt/ReceiptFit";
import { sharePng } from "@/components/pdf/renderPdf";
import { saveReceiptPdf } from "@/components/pdf/receiptPdf";
import { receiptFileName, type OfficialReceiptView } from "@/lib/officialReceipt";
import { memberReceipts } from "@/lib/texts/receipt";

type Pending = { receipt: OfficialReceiptView; action: "pdf" | "share" };

export default function PaymentReceipts({ source = "/api/user/receipts" }: { source?: string }) {
  const [rows, setRows] = useState<OfficialReceiptView[] | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!pending) return;
    const { receipt, action } = pending;
    const node = captureRef.current;
    const run =
      action === "pdf"
        ? saveReceiptPdf(receipt, receiptFileName(receipt.number, "pdf"))
        : node
          ? sharePng(node, receiptFileName(receipt.number, "png"), memberReceipts.title)
          : Promise.resolve();
    run
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== "AbortError") console.error("Receipt error:", err);
      })
      .finally(() => setPending(null));
  }, [pending]);

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
            <ReceiptFit>
              <ReceiptCard receipt={receipt} />
            </ReceiptFit>
            <div className="flex gap-2 mt-2">
              <button
                className="btn flex-1"
                disabled={pending !== null}
                onClick={() => setPending({ receipt, action: "pdf" })}
              >
                <IconLabel name="file">{memberReceipts.pdf}</IconLabel>
              </button>
              <button
                className="btn flex-1"
                disabled={pending !== null}
                onClick={() => setPending({ receipt, action: "share" })}
              >
                <IconLabel name="upload">{memberReceipts.share}</IconLabel>
              </button>
            </div>
          </div>
        ))}
      </div>

      {pending?.action === "share" && (
        <div style={{ position: "fixed", left: -10000, top: 0 }} aria-hidden="true">
          <ReceiptCard receipt={pending.receipt} innerRef={captureRef} />
        </div>
      )}
    </div>
  );
}
