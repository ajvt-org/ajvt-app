"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ReceiptCard from "@/components/receipt/ReceiptCard";
import ReceiptFit from "@/components/receipt/ReceiptFit";
import { money } from "@/lib/money";
import { receiptDate, type OfficialReceiptView } from "@/lib/officialReceipt";
import { RECEIPT_STATUS_LABEL } from "@/lib/texts/paymentCard";
import { memberReceipts } from "@/lib/texts/receipt";

export default function ReceiptRow({
  receipt,
  open,
  busy,
  onToggle,
  onPdf,
  onShare,
}: {
  receipt: OfficialReceiptView;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onPdf: () => void;
  onShare: () => void;
}) {
  const voided = receipt.status === "VOID";

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--mint-100)" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-2 p-3 text-start min-w-0"
        style={{ background: "var(--surface-2)" }}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2 min-w-0">
            <span
              className="text-sm font-bold truncate"
              style={{ color: voided ? "var(--text-muted)" : "var(--text-main)" }}
            >
              {receipt.reason}
            </span>
            <span
              className="text-sm font-bold shrink-0"
              style={{
                color: voided ? "var(--text-muted)" : "var(--mint-700)",
                textDecoration: voided ? "line-through" : undefined,
              }}
            >
              {money(receipt.amount)}
            </span>
          </span>
          <span
            className="flex items-center justify-between gap-2 mt-1 min-w-0 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="truncate">{receipt.number}</span>
              {voided && (
                <span className="badge badge-rejected shrink-0 text-xs">
                  {RECEIPT_STATUS_LABEL.VOID}
                </span>
              )}
            </span>
            <span className="shrink-0">{receiptDate(receipt.issuedOn)}</span>
          </span>
        </span>
        <Icon
          name={open ? "chevronUp" : "chevronDown"}
          size={16}
          className="shrink-0"
          color="var(--text-muted)"
        />
      </button>

      {open && (
        <div className="p-3">
          <ReceiptFit>
            <ReceiptCard receipt={receipt} />
          </ReceiptFit>
          <div className="flex gap-2 mt-2">
            <button className="btn btn-sm flex-1" disabled={busy} onClick={onPdf}>
              <IconLabel name="file">{memberReceipts.pdf}</IconLabel>
            </button>
            <button className="btn btn-sm flex-1" disabled={busy} onClick={onShare}>
              <IconLabel name="upload">{memberReceipts.share}</IconLabel>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
