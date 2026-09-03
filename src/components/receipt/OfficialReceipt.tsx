import { amountInWords } from "@/lib/arabicAmount";
import { moneyDigits } from "@/lib/money";
import { receiptDate, type OfficialReceiptView } from "@/lib/officialReceipt";
import { receiptSheet } from "@/lib/texts/receipt";
import ReceiptLine from "./ReceiptLine";
import ReceiptFooter from "./ReceiptFooter";
import {
  RECEIPT_WIDTH,
  RECEIPT_BRONZE,
  RECEIPT_INK,
  RECEIPT_LOGO,
  RECEIPT_MUTED,
  RECEIPT_PAPER,
  RECEIPT_RULE,
} from "./receiptStyle";

function Header() {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ flex: 1, textAlign: "right", lineHeight: 1.35, order: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: RECEIPT_INK }}>{receiptSheet.org}</div>
        <div style={{ fontSize: 11, color: RECEIPT_MUTED }}>{receiptSheet.secretariat}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: RECEIPT_BRONZE, marginTop: 4 }}>
          {receiptSheet.kind}
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={RECEIPT_LOGO}
        alt={receiptSheet.logoAlt}
        width={52}
        height={52}
        style={{ flex: "none", order: 2 }}
      />
    </div>
  );
}

function VoidMark() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          transform: "rotate(-18deg)",
          border: `3px solid ${RECEIPT_BRONZE}`,
          color: RECEIPT_BRONZE,
          opacity: 0.55,
          fontSize: 34,
          fontWeight: 700,
          padding: "4px 26px",
          borderRadius: 6,
        }}
      >
        {receiptSheet.voided}
      </span>
    </div>
  );
}

export default function OfficialReceipt({
  receipt,
  qrDataUrl,
}: {
  receipt: OfficialReceiptView;
  qrDataUrl: string | null;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: RECEIPT_WIDTH,
        background: RECEIPT_PAPER,
        color: RECEIPT_INK,
        direction: "rtl",
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 9,
      }}
    >
      <Header />
      <div style={{ height: 1.5, background: RECEIPT_RULE, margin: "2px 0 6px" }} />
      <ReceiptLine label={receiptSheet.payer} value={receipt.payerName} />
      <ReceiptLine label={receiptSheet.reason} value={receipt.reason} />
      <ReceiptLine label={receiptSheet.inWords} value={amountInWords(receipt.amount)} />
      <ReceiptLine
        label={receiptSheet.inFigures}
        value={moneyDigits(receipt.amount)}
        trailing={receiptSheet.currency}
      />
      <ReceiptLine label={receiptSheet.date} value={receiptDate(receipt.issuedOn)} />
      <ReceiptFooter
        secretary={receipt.secretary}
        treasurer={receipt.treasurer}
        number={receipt.number}
        qrDataUrl={qrDataUrl}
      />
      {receipt.status === "VOID" && <VoidMark />}
    </div>
  );
}
