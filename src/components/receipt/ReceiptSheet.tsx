"use client";

import type { OfficialReceiptView } from "@/lib/officialReceipt";
import OfficialReceipt from "./OfficialReceipt";
import { useReceiptQr } from "./useReceiptQr";
import { amiri } from "./receiptFont";
import { RECEIPT_PAPER, SHEET_PADDING } from "./receiptStyle";

export function ReceiptCard({
  receipt,
  innerRef,
}: {
  receipt: OfficialReceiptView;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  const qrDataUrl = useReceiptQr(receipt.token);
  return (
    <div
      ref={innerRef}
      className={amiri.className}
      style={{ width: "max-content", background: RECEIPT_PAPER }}
    >
      <OfficialReceipt receipt={receipt} qrDataUrl={qrDataUrl} />
    </div>
  );
}

export default function ReceiptSheet({
  receipt,
  qrDataUrl = null,
  innerRef,
}: {
  receipt: OfficialReceiptView;
  qrDataUrl?: string | null;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={innerRef}
      className={amiri.className}
      style={{
        width: "max-content",
        background: RECEIPT_PAPER,
        padding: SHEET_PADDING,
      }}
    >
      <OfficialReceipt receipt={receipt} qrDataUrl={qrDataUrl} />
    </div>
  );
}
