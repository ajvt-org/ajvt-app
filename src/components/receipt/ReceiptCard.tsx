"use client";

import type { OfficialReceiptView } from "@/lib/officialReceipt";
import OfficialReceipt from "./OfficialReceipt";
import { useReceiptQr } from "./useReceiptQr";
import { amiri } from "./receiptFont";
import { RECEIPT_PAPER } from "./receiptStyle";

export default function ReceiptCard({
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
