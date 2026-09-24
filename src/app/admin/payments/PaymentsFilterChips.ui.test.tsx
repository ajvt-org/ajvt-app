import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { amountChipLabel } from "@/lib/texts";
import { NO_AMOUNT } from "@/lib/amountFilter";
import { NO_PAYMENTS_FILTERS, type PaymentsFilters } from "./paymentsFilters";
import PaymentsFilterChips from "./PaymentsFilterChips";

function renderChips(over: Partial<PaymentsFilters>) {
  const onChange = vi.fn();
  render(
    <PaymentsFilterChips
      filters={{ ...NO_PAYMENTS_FILTERS, ...over }}
      accountOptions={[]}
      resultCount={3}
      onChange={onChange}
    />,
  );
  return onChange;
}

describe("the payments chip row", () => {
  it("shows the amount filter as one chip naming the operator and the figure", () => {
    renderChips({ amount: { op: "lt", figure: "500" } });

    expect(screen.getByText(amountChipLabel("lt", 500))).toBeDefined();
  });

  it("shows no amount chip while no figure is typed", () => {
    renderChips({ amount: { op: "eq", figure: "" } });

    expect(screen.queryByText(amountChipLabel("eq", 0))).toBeNull();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("clears the amount and keeps the rest", () => {
    const onChange = renderChips({ amount: { op: "gt", figure: "500" }, status: "ACTIVE" });

    fireEvent.click(screen.getByText(amountChipLabel("gt", 500)));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ amount: NO_AMOUNT, status: "ACTIVE" }),
    );
  });

  it("puts the kind back to all when its chip is removed", () => {
    const onChange = renderChips({ kind: "DONATION" });

    fireEvent.click(screen.getAllByRole("button")[0]);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ kind: "ALL" }));
  });
});
