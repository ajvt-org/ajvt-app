import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import TreasuryView from "./TreasuryView";
import type { Treasury } from "@/lib/treasury";
import { treasury as texts } from "@/lib/texts";
import { money, moneyDigits } from "@/lib/money";
import { EXACT_TEXT } from "@tests/ui/exactText";

function view(over: Partial<Treasury> = {}) {
  return viewIn(over);
}

function viewIn(over: Partial<Treasury> = {}) {
  cleanup();
  return render(
    <TreasuryView
      treasury={{
        balance: 3800,
        income: 5000,
        spending: 1200,
        fees: 3000,
        support: 2000,
        byMethod: [{ method: "بنكيلي", amount: 5000 }],
        spendingByMethod: [{ method: "نقداً", amount: 1200 }],
        ...over,
      }}
    />,
  );
}

describe("TreasuryView", () => {
  it("leads with the balance", () => {
    const { container } = view();

    expect(screen.getByText(texts.balance)).toBeDefined();
    expect(container.textContent).toContain(money(3800));
  });

  it("shows what came in and what went out", () => {
    view({ byMethod: [], spendingByMethod: [] });

    expect(screen.getByText(texts.income)).toBeDefined();
    expect(screen.getByText(moneyDigits(5000), EXACT_TEXT)).toBeDefined();
    expect(screen.getByText(texts.spending)).toBeDefined();
    expect(screen.getByText(moneyDigits(1200), EXACT_TEXT)).toBeDefined();
  });

  it("splits the income into fees and support", () => {
    view({ byMethod: [], spendingByMethod: [] });

    expect(screen.getByText(texts.fees)).toBeDefined();
    expect(screen.getByText(moneyDigits(3000), EXACT_TEXT)).toBeDefined();
    expect(screen.getByText(texts.support)).toBeDefined();
    expect(screen.getByText(moneyDigits(2000), EXACT_TEXT)).toBeDefined();
  });

  it("puts every amount of one card on a single grid so the columns line up", () => {
    const { container } = viewIn({ byMethod: [], spendingByMethod: [] });

    const grid = container.querySelector("[style*='1fr auto auto']") as HTMLElement;
    expect(grid).not.toBeNull();
    const amounts = [...grid.querySelectorAll("[dir=ltr]")].map((n) => n.textContent);
    expect(amounts).toEqual([5000, 3000, 2000, 1200].map(moneyDigits));
  });

  it("reads the amount before the currency, the way the balance above it does", () => {
    const { container } = viewIn({ byMethod: [], spendingByMethod: [] });

    const grid = container.querySelector("[style*='1fr auto auto']") as HTMLElement;
    const [label, amount, currency] = [...grid.children];
    expect(label.textContent).toBe(texts.income);
    expect(amount.textContent).toBe(moneyDigits(5000));
    expect(currency.textContent).toBe(texts.currency);
  });

  it("right-aligns the amounts so the leading digit shows the size", () => {
    const { container } = viewIn({ byMethod: [], spendingByMethod: [] });

    const grid = container.querySelector("[style*='1fr auto auto']") as HTMLElement;
    const amount = grid.querySelector("[dir=ltr]") as HTMLElement;
    expect(amount.getAttribute("style")).toContain("text-align: right");
  });

  it("breaks the spending down by how it was paid", () => {
    view({ spendingByMethod: [{ method: "أخرى", amount: 700 }] });

    expect(screen.getByText(texts.spendingByMethod)).toBeDefined();
    expect(screen.getByText("أخرى")).toBeDefined();
    expect(screen.getByText(moneyDigits(700), EXACT_TEXT)).toBeDefined();
  });

  it("says so when nothing has gone out yet", () => {
    view({ spendingByMethod: [] });

    expect(screen.getByText(texts.noSpending)).toBeDefined();
  });

  it("says so when nothing has come in yet", () => {
    view({ byMethod: [] });

    expect(screen.getByText(texts.noIncome)).toBeDefined();
  });

  it("names each payment method that brought money in", () => {
    view({ byMethod: [{ method: "نقداً", amount: 400 }], spendingByMethod: [] });

    expect(screen.getByText("نقداً")).toBeDefined();
    expect(screen.getByText("400")).toBeDefined();
  });
});
