import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ReceiptRow from "./ReceiptRow";
import { money } from "@/lib/money";
import type { OfficialReceiptView } from "@/lib/officialReceipt";

vi.mock("@/components/receipt/ReceiptCard", () => ({ default: () => null }));

const REASON = "دعم دوري كرة القدم لشباب القرية في العطلة الصيفية";

function receipt(over: Partial<OfficialReceiptView> = {}): OfficialReceiptView {
  return {
    number: "R-2026-0001",
    payerName: "محمد ولد أحمد",
    reason: REASON,
    amount: 25000,
    issuedOn: "2026-08-20T09:00:00.000Z",
    secretary: null,
    treasurer: null,
    status: "ACTIVE",
    ...over,
  };
}

function show(over: Partial<OfficialReceiptView> = {}) {
  return render(
    <ReceiptRow
      receipt={receipt(over)}
      open={false}
      busy={false}
      onToggle={vi.fn()}
      onPdf={vi.fn()}
      onShare={vi.fn()}
    />,
  );
}

describe("the row a receipt folds into", () => {
  it("gives the reason as many lines as it needs", () => {
    show();

    const reason = screen.getByText(REASON);
    expect(reason.className).not.toContain("truncate");
  });

  it("keeps the whole reason rather than an opening the reader already knew", () => {
    show();

    expect(screen.getByText(REASON).textContent).toBe(REASON);
  });

  it("keeps the amount on the first line of the reason", () => {
    show();

    const amount = screen.getByText((_, node) => node?.textContent === money(25000), {
      selector: "span.shrink-0",
    });
    expect(amount.className).toContain("shrink-0");
    expect(amount.parentElement!.className).toContain("items-baseline");
  });

  it("still holds the number and the date on their own line", () => {
    show();

    expect(screen.getByText("R-2026-0001")).toBeTruthy();
  });
});
