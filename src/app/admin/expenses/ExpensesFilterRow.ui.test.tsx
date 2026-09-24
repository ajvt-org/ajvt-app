import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { expensesPage, filterSheet } from "@/lib/texts";
import type { DestinationOption } from "@/lib/moneyDestination";
import { NO_EXPENSES_FILTERS, type ExpensesFilters } from "./expensesFilters";
import ExpensesFilterRow from "./ExpensesFilterRow";

const DESTINATIONS = [{ id: "act-1", kind: "activity", title: "الدوري" }] as DestinationOption[];
const TAGS = [
  { id: "a", name: "نقل" },
  { id: "b", name: "إيجار" },
];

function renderRow(over: Partial<ExpensesFilters> = {}) {
  const onChange = vi.fn();
  render(
    <ExpensesFilterRow
      filters={{ ...NO_EXPENSES_FILTERS, ...over }}
      destinations={DESTINATIONS}
      tags={TAGS}
      onChange={onChange}
    />,
  );
  return onChange;
}

describe("the filters on the expenses page", () => {
  it("picks a destination", () => {
    const onChange = renderRow();

    fireEvent.change(screen.getByLabelText(expensesPage.byDestination), {
      target: { value: "act-1" },
    });

    expect(onChange).toHaveBeenCalledWith({ ...NO_EXPENSES_FILTERS, destinationId: "act-1" });
  });

  it("adds a tag to the ones already chosen", () => {
    const onChange = renderRow({ tagIds: ["a"] });

    fireEvent.click(screen.getByRole("button", { name: expensesPage.byTags }));
    fireEvent.click(screen.getByRole("checkbox", { name: "إيجار" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tagIds: ["a", "b"] }));
  });

  it("names the tag chosen rather than its id", () => {
    renderRow({ tagIds: ["b"] });

    expect(screen.getByRole("button", { name: expensesPage.byTags }).textContent).toContain(
      "إيجار",
    );
  });

  it("sets the range on the expense dates", () => {
    const onChange = renderRow({ dateFrom: "2026-08-01" });

    fireEvent.change(screen.getByLabelText(filterSheet.to), { target: { value: "2026-08-31" } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: "2026-08-01", dateTo: "2026-08-31" }),
    );
  });
});
