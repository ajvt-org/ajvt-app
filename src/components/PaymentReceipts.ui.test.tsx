import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentReceipts from "./PaymentReceipts";
import { memberReceipts } from "@/lib/texts/receipt";
import type { OfficialReceiptView } from "@/lib/officialReceipt";

const saveReceiptPdf = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const sharePng = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/components/pdf/receiptPdf", () => ({ saveReceiptPdf }));
vi.mock("@/components/pdf/renderPdf", () => ({ sharePng }));

const RECEIPT: OfficialReceiptView = {
  number: "R-2026-0001",
  token: "0123456789abcdef0123456789abcdef",
  payerName: "فاطمة محمد",
  reason: "اشتراك عضوية",
  amount: 5000,
  issuedOn: new Date(2026, 7, 24).toISOString(),
  secretary: "محمد الأمين",
  treasurer: "أحمد سالم",
  status: "ACTIVE",
};

class NoResize {
  observe() {}
  disconnect() {}
}

function show() {
  vi.stubGlobal("ResizeObserver", NoResize);
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ receipts: [RECEIPT] }) }),
  );
  return render(<PaymentReceipts />);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("saving a receipt a member holds", () => {
  it("draws the receipt from its own record rather than from the screen", async () => {
    show();
    await screen.findByText(memberReceipts.pdf);

    await userEvent.click(screen.getByText(memberReceipts.pdf));

    await waitFor(() => expect(saveReceiptPdf).toHaveBeenCalled());
    expect(saveReceiptPdf.mock.calls[0][0]).toMatchObject({ number: "R-2026-0001" });
    expect(sharePng).not.toHaveBeenCalled();
  });

  it("puts no second copy of the card on the page to be photographed", async () => {
    const { container } = show();
    await screen.findByText(memberReceipts.pdf);

    await userEvent.click(screen.getByText(memberReceipts.pdf));

    await waitFor(() => expect(saveReceiptPdf).toHaveBeenCalled());
    expect(container.querySelectorAll(String.raw`div[aria-hidden="true"]`)).toHaveLength(0);
  });

  it("still photographs the card for a share", async () => {
    show();
    await screen.findByText(memberReceipts.share);

    await userEvent.click(screen.getByText(memberReceipts.share));

    await waitFor(() => expect(sharePng).toHaveBeenCalled());
    expect(saveReceiptPdf).not.toHaveBeenCalled();
  });
});
