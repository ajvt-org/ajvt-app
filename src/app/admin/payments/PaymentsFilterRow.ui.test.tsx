import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { filterSheet } from "@/lib/texts";
import { NO_PAYMENTS_FILTERS, type PaymentsFilters } from "./paymentsFilters";
import PaymentsFilterRow from "./PaymentsFilterRow";

function renderRow(over: Partial<PaymentsFilters> = {}) {
  const onChange = vi.fn();
  render(<PaymentsFilterRow filters={{ ...NO_PAYMENTS_FILTERS, ...over }} onChange={onChange} />);
  return onChange;
}

describe("the filters on the payments page", () => {
  it("sets the start of the range and keeps the rest", () => {
    const onChange = renderRow({ kind: "DONATION", status: "PENDING" });

    fireEvent.change(screen.getByLabelText(filterSheet.from), { target: { value: "2026-03-01" } });

    expect(onChange).toHaveBeenCalledWith({
      ...NO_PAYMENTS_FILTERS,
      kind: "DONATION",
      status: "PENDING",
      from: "2026-03-01",
    });
  });

  it("sets the end of the range", () => {
    const onChange = renderRow({ from: "2026-03-01" });

    fireEvent.change(screen.getByLabelText(filterSheet.to), { target: { value: "2026-03-31" } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-03-01", to: "2026-03-31" }),
    );
  });

  it("lets go of the payment the page was holding open", () => {
    const onChange = renderRow({ focus: "p1" });

    fireEvent.change(screen.getByLabelText(filterSheet.from), { target: { value: "2026-03-01" } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ focus: "" }));
  });

  it("shows the range the url already holds", () => {
    renderRow({ from: "2026-03-01", to: "2026-03-31" });

    expect((screen.getByLabelText(filterSheet.from) as HTMLInputElement).value).toBe("2026-03-01");
    expect((screen.getByLabelText(filterSheet.to) as HTMLInputElement).value).toBe("2026-03-31");
  });
});
