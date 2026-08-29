import { receiptSheet } from "@/lib/texts/receipt";
import { RECEIPT_DOTS, RECEIPT_INK, RECEIPT_MUTED } from "./receiptStyle";

function Officer({ role, name }: { role: string; name: string | null }) {
  return (
    <div style={{ flex: 1, textAlign: "center", fontSize: 11 }}>
      <div style={{ color: RECEIPT_INK, fontWeight: 700 }}>{role}</div>
      <div
        style={{
          marginTop: 4,
          paddingTop: 4,
          borderTop: `1.5px dotted ${RECEIPT_DOTS}`,
          color: RECEIPT_MUTED,
          minHeight: 16,
        }}
      >
        {name ?? ""}
      </div>
    </div>
  );
}

export default function ReceiptFooter({
  secretary,
  treasurer,
  number,
  qrDataUrl,
}: {
  secretary: string | null;
  treasurer: string | null;
  number: string;
  qrDataUrl: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 10,
        marginTop: 18,
      }}
    >
      <Officer role={receiptSheet.secretary} name={secretary} />
      <Officer role={receiptSheet.treasurer} name={treasurer} />
      <div style={{ flex: "none", textAlign: "center" }}>
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt={receiptSheet.qrAlt} width={54} height={54} />
        ) : (
          <div style={{ width: 54, height: 54 }} />
        )}
        <div
          style={{
            direction: "ltr",
            fontSize: 9,
            color: RECEIPT_MUTED,
            marginTop: 2,
            letterSpacing: 0.2,
          }}
        >
          {number}
        </div>
      </div>
    </div>
  );
}
