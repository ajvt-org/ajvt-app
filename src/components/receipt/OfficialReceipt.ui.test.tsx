import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import OfficialReceipt from "./OfficialReceipt";
import ReceiptSheet from "./ReceiptSheet";
import { receiptSheet } from "@/lib/texts/receipt";
import type { OfficialReceiptView } from "@/lib/officialReceipt";

const RECEIPT: OfficialReceiptView = {
  number: "R-2026-0001",
  token: "0123456789abcdef0123456789abcdef",
  payerName: "السيدة فاطمة محمد عبد الله الحسن",
  reason: "دعم عام للرابطة",
  amount: 5000,
  issuedOn: new Date(2026, 7, 24).toISOString(),
  secretary: "محمد الأمين",
  treasurer: "أحمد سالم",
  status: "ACTIVE",
};

describe("the sheet an admin hands over", () => {
  it("names the association the way the form does", () => {
    render(<OfficialReceipt receipt={RECEIPT} qrDataUrl={null} />);

    expect(screen.getByText(receiptSheet.org)).toBeDefined();
    expect(screen.getByText(receiptSheet.secretariat)).toBeDefined();
    expect(screen.getByText(receiptSheet.kind)).toBeDefined();
  });

  it("carries the payer and the reason as they were entered", () => {
    render(<OfficialReceipt receipt={RECEIPT} qrDataUrl={null} />);

    expect(screen.getByText(RECEIPT.payerName)).toBeDefined();
    expect(screen.getByText(RECEIPT.reason)).toBeDefined();
  });

  it("writes the amount twice, in figures and in words", () => {
    render(<OfficialReceipt receipt={RECEIPT} qrDataUrl={null} />);

    expect(screen.getByText("5.000")).toBeDefined();
    expect(screen.getByText("خمسة آلاف أوقية")).toBeDefined();
  });

  it("prints the date the way the form does", () => {
    render(<OfficialReceipt receipt={RECEIPT} qrDataUrl={null} />);

    expect(screen.getByText("24 / 08 / 2026")).toBeDefined();
  });

  it("stands the association's mark between the two officers", () => {
    render(<OfficialReceipt receipt={RECEIPT} qrDataUrl={null} />);

    expect(screen.getByAltText(receiptSheet.sealAlt)).toBeDefined();
  });

  it("prints the two officers under their roles", () => {
    render(<OfficialReceipt receipt={RECEIPT} qrDataUrl={null} />);

    expect(screen.getByText(receiptSheet.secretary)).toBeDefined();
    expect(screen.getByText("محمد الأمين")).toBeDefined();
    expect(screen.getByText(receiptSheet.treasurer)).toBeDefined();
    expect(screen.getByText("أحمد سالم")).toBeDefined();
  });

  it("prints the roles even before anyone has filled the names in", () => {
    render(
      <OfficialReceipt
        receipt={{ ...RECEIPT, secretary: null, treasurer: null }}
        qrDataUrl={null}
      />,
    );

    expect(screen.getByText(receiptSheet.secretary)).toBeDefined();
    expect(screen.getByText(receiptSheet.treasurer)).toBeDefined();
  });

  it("shows the receipt number, and leaves a gap where the QR goes until it is drawn", () => {
    render(<OfficialReceipt receipt={RECEIPT} qrDataUrl={null} />);

    expect(screen.getByText("R-2026-0001")).toBeDefined();
    expect(screen.queryByAltText(receiptSheet.qrAlt)).toBeNull();
  });

  it("shows the QR once it is drawn", () => {
    render(<OfficialReceipt receipt={RECEIPT} qrDataUrl="data:image/png;base64,iVBOR" />);

    expect(screen.getByAltText(receiptSheet.qrAlt)).toBeDefined();
  });

  it("says nothing about being cancelled while it is valid", () => {
    render(<OfficialReceipt receipt={RECEIPT} qrDataUrl={null} />);

    expect(screen.queryByText(receiptSheet.voided)).toBeNull();
  });

  it("stamps a cancelled receipt across its face", () => {
    render(<OfficialReceipt receipt={{ ...RECEIPT, status: "VOID" }} qrDataUrl={null} />);

    expect(screen.getByText(receiptSheet.voided)).toBeDefined();
  });
});

describe("the page that goes to the printer", () => {
  it("carries the same receipt twice, one to keep and one to hand over", () => {
    render(<ReceiptSheet receipt={RECEIPT} />);

    expect(screen.getAllByText("R-2026-0001")).toHaveLength(2);
    expect(screen.getAllByText("خمسة آلاف أوقية")).toHaveLength(2);
  });
});
