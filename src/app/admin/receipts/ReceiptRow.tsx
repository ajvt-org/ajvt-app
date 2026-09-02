"use client";

import { receiptDate, type OfficialReceiptView } from "@/lib/officialReceipt";
import { ouguiya } from "@/lib/texts/currency";
import { receiptAdmin } from "@/lib/texts/receipt";
import IconLabel from "@/components/IconLabel";

export default function ReceiptRow({
  receipt,
  busy,
  onPrint,
  onVoid,
}: {
  receipt: OfficialReceiptView;
  busy: boolean;
  onPrint: () => void;
  onVoid: () => void;
}) {
  const voided = receipt.status === "VOID";

  return (
    <li className="card p-4 flex flex-col gap-1">
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-sm min-w-0" style={{ color: "var(--text-main)" }}>
          {receipt.payerName}
        </p>
        <p className="font-bold text-sm shrink-0" style={{ color: "var(--mint-700)" }}>
          <bdi>{ouguiya.amount(receipt.amount)}</bdi>
        </p>
      </div>

      {voided && (
        <div>
          <span className="badge badge-rejected">
            <IconLabel name="ban" size={11}>
              {receiptAdmin.statusVoid}
            </IconLabel>
          </span>
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {receipt.reason}
      </p>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        <span dir="ltr">{receipt.number}</span> · {receiptDate(receipt.issuedOn)}
      </p>

      <div className="flex items-center gap-2 flex-wrap mt-2">
        <button className="btn btn-ghost btn-sm text-xs" disabled={busy} onClick={onPrint}>
          <IconLabel name="download">{receiptAdmin.download}</IconLabel>
        </button>
        {!voided && (
          <button className="btn btn-danger btn-sm text-xs ms-auto" onClick={onVoid}>
            <IconLabel name="ban">{receiptAdmin.voidAction}</IconLabel>
          </button>
        )}
      </div>
    </li>
  );
}
