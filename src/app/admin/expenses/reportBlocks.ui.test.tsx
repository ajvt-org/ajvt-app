import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import ByPaymentMethod from "./ByPaymentMethod";
import DailyRevenue from "./DailyRevenue";
import { byPaymentMethod, dailyRevenue } from "@/lib/texts";

afterEach(cleanup);

function opensClosed(block: HTMLElement, heading: string) {
  const card = block.querySelector("details") as HTMLDetailsElement;
  expect(card).not.toBeNull();
  expect(card.open).toBe(false);
  const summary = card.querySelector("summary") as HTMLElement;
  expect(summary.className).toContain("disclosure-summary");
  expect(summary.textContent).toContain(heading);
  expect(summary.querySelector(".disclosure-chevron")).not.toBeNull();
}

describe("the report blocks under the ledger", () => {
  it("keeps the payment method breakdown closed until it is asked for", () => {
    const { container } = render(
      <ByPaymentMethod
        byMethod={[["بنكيلي", 40000]]}
        details={{}}
        expanded={new Set()}
        onToggle={vi.fn()}
      />,
    );

    opensClosed(container, byPaymentMethod.title);
  });

  it("keeps the daily revenue closed until it is asked for", () => {
    const { container } = render(
      <DailyRevenue days={[]} expanded={new Set()} onToggle={vi.fn()} />,
    );

    opensClosed(container, dailyRevenue.title);
  });
});
