"use client";

import { type OfficialReceiptView } from "@/lib/officialReceipt";
import { receiptAdmin } from "@/lib/texts/receipt";
import ReceiptRow from "./ReceiptRow";

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
        <ReceiptRow
          key={receipt.number}
          receipt={receipt}
          busy={busyId === receipt.number}
          onPrint={() => onPrint(receipt)}
          onVoid={() => onVoid(receipt)}
        />
      ))}
    </ul>
  );
}
