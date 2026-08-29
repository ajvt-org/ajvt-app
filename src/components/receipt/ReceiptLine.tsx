import { RECEIPT_DOTS, RECEIPT_INK, RECEIPT_MUTED } from "./receiptStyle";

export default function ReceiptLine({
  label,
  value,
  trailing,
}: {
  label: string;
  value: string;
  trailing?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 10,
        borderBottom: `1.5px dotted ${RECEIPT_DOTS}`,
        paddingBottom: 3,
        fontSize: 13,
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ color: RECEIPT_MUTED }}>{label} : </span>
        <span style={{ color: RECEIPT_INK, fontWeight: 700 }}>{value}</span>
      </span>
      {trailing && (
        <span style={{ color: RECEIPT_MUTED, fontSize: 11, flex: "none" }}>{trailing}</span>
      )}
    </div>
  );
}
