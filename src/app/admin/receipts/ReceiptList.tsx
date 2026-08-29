"use client";

import { receiptDate, type OfficialReceiptView } from "@/lib/officialReceipt";
import { receiptAdmin, receiptSheet } from "@/lib/texts/receipt";
import IconLabel from "@/components/IconLabel";

export default function ReceiptList({
  receipts,
  busyId,
  onPrint,
  onVoid,
}: {
  receipts: OfficialReceiptView[];
  busyId: string | null;
  onPrint: (receipt: OfficialReceiptView) => void;
  onVoid: (receipt: OfficialReceiptView) => void;
}) {
  if (receipts.length === 0) {
    return (
      <p className="card p-5 text-sm" style={{ color: "var(--text-muted)" }}>
        {receiptAdmin.empty}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {receipts.map((receipt) => (
        <li key={receipt.number} className="card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
              {receipt.payerName}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {receipt.reason}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              <span dir="ltr">{receipt.number}</span> · {receiptDate(receipt.issuedOn)} ·{" "}
              {receipt.status === "VOID" ? receiptAdmin.statusVoid : receiptAdmin.statusActive}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-black text-sm" style={{ color: "var(--text-main)" }}>
              {receipt.amount} {receiptSheet.currency}
            </span>
            <button
              className="btn btn-ghost text-xs"
              disabled={busyId === receipt.number}
              onClick={() => onPrint(receipt)}
            >
              <IconLabel name="file">{receiptAdmin.download}</IconLabel>
            </button>
            {receipt.status === "ACTIVE" && (
              <button className="btn btn-ghost text-xs" onClick={() => onVoid(receipt)}>
                <IconLabel name="ban">{receiptAdmin.voidAction}</IconLabel>
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
