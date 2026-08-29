"use client";

import type { OfficialReceiptView } from "@/lib/officialReceipt";
import OfficialReceipt from "./OfficialReceipt";
import { useReceiptQr } from "./useReceiptQr";
import { amiri } from "./receiptFont";
import {
  RECEIPT_DOTS,
  RECEIPT_PAPER,
  SHEET_DIVIDER,
  SHEET_HEIGHT,
  SHEET_PADDING,
  SHEET_WIDTH,
} from "./receiptStyle";

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
        width: SHEET_WIDTH,
        height: SHEET_HEIGHT,
        background: RECEIPT_PAPER,
        padding: SHEET_PADDING,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", direction: "rtl", alignItems: "stretch" }}>
        <OfficialReceipt receipt={receipt} qrDataUrl={qrDataUrl} />
        <div style={{ borderRight: `${SHEET_DIVIDER}px dashed ${RECEIPT_DOTS}` }} />
        <OfficialReceipt receipt={receipt} qrDataUrl={qrDataUrl} />
      </div>
      <div style={{ borderTop: `${SHEET_DIVIDER}px dashed ${RECEIPT_DOTS}`, marginTop: 12 }} />
    </div>
  );
}
