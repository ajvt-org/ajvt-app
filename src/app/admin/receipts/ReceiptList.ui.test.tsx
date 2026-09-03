import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReceiptList from "./ReceiptList";
import { receiptAdmin } from "@/lib/texts/receipt";
import type { OfficialReceiptView } from "@/lib/officialReceipt";
import { money } from "@/lib/money";

const MONEY = money(5000);

const RECEIPT: OfficialReceiptView = {
  number: "R-2026-0007",
  token: "0123456789abcdef0123456789abcdef",
  payerName: "السيدة فاطمة محمد عبد الله الحسن",
  reason: "دعم عام للرابطة",
  amount: 5000,
  issuedOn: new Date(2026, 7, 24).toISOString(),
  secretary: "محمد الأمين",
  treasurer: "أحمد سالم",
  status: "ACTIVE",
};

function setup(receipt: OfficialReceiptView = RECEIPT) {
  const onPrint = vi.fn();
  const onVoid = vi.fn();
  const view = render(
    <ReceiptList receipts={[receipt]} busyId={null} onPrint={onPrint} onVoid={onVoid} />,
  );
  return { ...view, onPrint, onVoid };
}

describe("a receipt with no verify token", () => {
  it("offers no download, because there is nothing to build the code from", () => {
    const { token, ...withheld } = RECEIPT;
    void token;
    setup(withheld);

    expect(screen.queryByText(receiptAdmin.download)).toBeNull();
  });

  it("still shows the row, its number and its amount", () => {
    const { token, ...withheld } = RECEIPT;
    void token;
    const { container } = setup(withheld);

    expect(screen.getByText(RECEIPT.number)).toBeDefined();
    expect(container.textContent).toContain(MONEY);
  });

  it("offers the download when the token is there", () => {
    setup();

    expect(screen.getByText(receiptAdmin.download)).toBeDefined();
  });

  it("offers no void either, since the payer cannot be identified", () => {
    const { token, ...withheld } = RECEIPT;
    void token;
    setup(withheld);

    expect(screen.queryByText(receiptAdmin.voidAction)).toBeNull();
  });

  it("offers the void when the token is there", () => {
    setup();

    expect(screen.getByText(receiptAdmin.voidAction)).toBeDefined();
  });
});

describe("the receipts register", () => {
  it("says so when nothing has been issued", () => {
    render(<ReceiptList receipts={[]} busyId={null} onPrint={vi.fn()} onVoid={vi.fn()} />);

    expect(screen.getByText(receiptAdmin.empty)).toBeDefined();
  });

  it("names the payer, which is how a receipt is found", () => {
    setup();

    expect(screen.getByText(RECEIPT.payerName)).toBeDefined();
    expect(screen.getByText(RECEIPT.number)).toBeDefined();
  });

  it("writes the amount the way the rest of the admin writes it", () => {
    const { container } = setup();

    expect(container.textContent).toContain(MONEY);
  });

  it("keeps every action on the compact button, so the row cannot outgrow a phone", () => {
    const { container } = setup();

    const buttons = [...container.querySelectorAll("button")];
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((button) => expect(button.className).toContain("btn-sm"));
  });

  it("lets nothing inside the row refuse to shrink", () => {
    const { container } = setup();

    const name = screen.getByText(RECEIPT.payerName);
    expect(name.className).toContain("min-w-0");
    expect(container.querySelector(".shrink-0")?.textContent).toBe(MONEY);
  });

  it("offers to cancel a receipt that is still active and marks it with no badge", () => {
    const { container, onVoid } = setup();

    expect(container.querySelector(".badge")).toBeNull();
    expect(screen.getByRole("button", { name: new RegExp(receiptAdmin.voidAction) })).toBeDefined();
    expect(onVoid).not.toHaveBeenCalled();
  });

  it("marks a cancelled receipt the way the admin marks any cancelled record", () => {
    const { container } = setup({ ...RECEIPT, status: "VOID" });

    const badge = container.querySelector(".badge");
    expect(badge?.className).toContain("badge-rejected");
    expect(badge?.textContent).toBe(receiptAdmin.statusVoid);
    expect(screen.queryByRole("button", { name: new RegExp(receiptAdmin.voidAction) })).toBeNull();
  });

  it("still hands a cancelled receipt over as a PDF", async () => {
    const { onPrint } = setup({ ...RECEIPT, status: "VOID" });

    await userEvent.click(screen.getByRole("button", { name: new RegExp(receiptAdmin.download) }));

    expect(onPrint).toHaveBeenCalledWith({ ...RECEIPT, status: "VOID" });
  });

  it("holds the download while that receipt is being rendered", () => {
    const onPrint = vi.fn();
    render(
      <ReceiptList
        receipts={[RECEIPT]}
        busyId={RECEIPT.number}
        onPrint={onPrint}
        onVoid={vi.fn()}
      />,
    );

    expect(
      screen
        .getByRole("button", { name: new RegExp(receiptAdmin.download) })
        .hasAttribute("disabled"),
    ).toBe(true);
  });
});
