import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentReceipts from "./PaymentReceipts";
import { memberReceipts } from "@/lib/texts/receipt";
import { RECEIPT_STATUS_LABEL } from "@/lib/texts/paymentCard";
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

const SECOND: OfficialReceiptView = {
  ...RECEIPT,
  number: "R-2026-0002",
  reason: "دعم نشاط",
  amount: 2000,
};

const VOIDED: OfficialReceiptView = { ...SECOND, number: "R-2026-0003", status: "VOID" };

class NoResize {
  observe() {}
  disconnect() {}
}

function show(receipts: OfficialReceiptView[] = [RECEIPT]) {
  vi.stubGlobal("ResizeObserver", NoResize);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ receipts }) }),
  );
  return render(<PaymentReceipts />);
}

function rows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("button[aria-expanded]"));
}

function openState(): (string | null)[] {
  return rows().map((row) => row.getAttribute("aria-expanded"));
}

async function toggleRow(index: number) {
  await waitFor(() => expect(rows().length).toBeGreaterThan(index));
  await userEvent.click(rows()[index]);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("the receipts a member holds", () => {
  it("lands as a list with nothing opened", async () => {
    show([RECEIPT, SECOND]);

    await screen.findByText(RECEIPT.number);
    expect(screen.getByText(SECOND.number)).not.toBeNull();
    expect(screen.queryByText(memberReceipts.pdf)).toBeNull();
    expect(screen.queryByText(memberReceipts.share)).toBeNull();
  });

  it("opens one receipt at a time", async () => {
    show([RECEIPT, SECOND]);

    await toggleRow(0);
    expect(screen.getAllByText(memberReceipts.pdf)).toHaveLength(1);
    expect(openState()).toEqual(["true", "false"]);

    await toggleRow(1);
    expect(screen.getAllByText(memberReceipts.pdf)).toHaveLength(1);
    expect(openState()).toEqual(["false", "true"]);
  });

  it("closes the open receipt when its row is pressed again", async () => {
    show();

    await toggleRow(0);
    await toggleRow(0);

    expect(screen.queryByText(memberReceipts.pdf)).toBeNull();
    expect(openState()).toEqual(["false"]);
  });

  it("marks a withdrawn receipt on the row without opening it", async () => {
    show([VOIDED]);

    await screen.findByText(VOIDED.number);
    expect(screen.getByText(RECEIPT_STATUS_LABEL.VOID)).not.toBeNull();
    expect(screen.queryByText(memberReceipts.pdf)).toBeNull();
  });

  it("draws the receipt from its own record rather than from the screen", async () => {
    show();
    await toggleRow(0);

    await userEvent.click(screen.getByText(memberReceipts.pdf));

    await waitFor(() => expect(saveReceiptPdf).toHaveBeenCalled());
    expect(saveReceiptPdf.mock.calls[0][0]).toMatchObject({ number: "R-2026-0001" });
    expect(sharePng).not.toHaveBeenCalled();
  });

  it("puts no second copy of the card on the page to be photographed", async () => {
    const { container } = show();
    await toggleRow(0);

    await userEvent.click(screen.getByText(memberReceipts.pdf));

    await waitFor(() => expect(saveReceiptPdf).toHaveBeenCalled());
    expect(container.querySelectorAll(String.raw`div[aria-hidden="true"]`)).toHaveLength(0);
  });

  it("still photographs the card for a share", async () => {
    show();
    await toggleRow(0);

    await userEvent.click(screen.getByText(memberReceipts.share));

    await waitFor(() => expect(sharePng).toHaveBeenCalled());
    expect(sharePng.mock.calls[0][0]).not.toBeNull();
    expect(saveReceiptPdf).not.toHaveBeenCalled();
  });
});
