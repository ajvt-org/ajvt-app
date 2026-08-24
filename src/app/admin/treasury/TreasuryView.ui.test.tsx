import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import TreasuryView from "./TreasuryView";
import type { Treasury } from "@/lib/treasury";
import { treasury as texts } from "@/lib/texts";

function view(over: Partial<Treasury> = {}) {
  cleanup();
  render(
    <TreasuryView
      treasury={{
        balance: 3800,
        income: 5000,
        spending: 1200,
        fees: 3000,
        support: 2000,
        byMethod: [{ method: "بنكيلي", amount: 5000 }],
        ...over,
      }}
    />,
  );
}

describe("TreasuryView", () => {
  it("leads with the balance", () => {
    view();

    expect(screen.getByText(texts.balance)).toBeDefined();
    expect(screen.getByText(texts.ouguiya(3800))).toBeDefined();
  });

  it("shows what came in and what went out", () => {
    view({ byMethod: [] });

    expect(screen.getByText(texts.income)).toBeDefined();
    expect(screen.getByText(texts.ouguiya(5000))).toBeDefined();
    expect(screen.getByText(texts.spending)).toBeDefined();
    expect(screen.getByText(texts.ouguiya(1200))).toBeDefined();
  });

  it("splits the income into fees and support", () => {
    view({ byMethod: [] });

    expect(screen.getByText(texts.fees)).toBeDefined();
    expect(screen.getByText(texts.ouguiya(3000))).toBeDefined();
    expect(screen.getByText(texts.support)).toBeDefined();
    expect(screen.getByText(texts.ouguiya(2000))).toBeDefined();
  });

  it("says so when nothing has come in yet", () => {
    view({ byMethod: [] });

    expect(screen.getByText(texts.noIncome)).toBeDefined();
  });

  it("names each payment method that brought money in", () => {
    view({ byMethod: [{ method: "نقداً", amount: 400 }] });

    expect(screen.getByText("نقداً")).toBeDefined();
    expect(screen.getByText(texts.ouguiya(400))).toBeDefined();
  });
});
