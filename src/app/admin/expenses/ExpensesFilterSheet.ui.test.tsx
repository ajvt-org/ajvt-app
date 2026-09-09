import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import ExpensesFilterSheet from "./ExpensesFilterSheet";
import ExpensesFilterChips from "./ExpensesFilterChips";
import { NO_EXPENSES_FILTERS, type ExpensesFilters } from "./expensesFilters";
import { destinationPicker, expensesPage, filterSheet } from "@/lib/texts";
import type { DestinationOption } from "@/lib/moneyDestination";

afterEach(cleanup);

const DESTINATIONS: DestinationOption[] = [
  { id: "act-1", title: "قافلة التاكلالت", kind: "activity" },
];
const TAGS = [
  { id: "t1", name: "نقل" },
  { id: "t2", name: "بناء" },
];

function sheet(filters: Partial<ExpensesFilters> = {}) {
  const onChange = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <ExpensesFilterSheet
      filters={{ ...NO_EXPENSES_FILTERS, ...filters }}
      destinations={DESTINATIONS}
      tags={TAGS}
      resultCount={7}
      onChange={onChange}
      onClose={onClose}
    />,
  );
  return { onChange, onClose, ...view };
}

function chips(filters: Partial<ExpensesFilters> = {}) {
  const onChange = vi.fn();
  const view = render(
    <ExpensesFilterChips
      filters={{ ...NO_EXPENSES_FILTERS, ...filters }}
      destinations={DESTINATIONS}
      tags={TAGS}
      resultCount={7}
      onChange={onChange}
    />,
  );
  return { onChange, ...view };
}

describe("the expenses filter sheet", () => {
  it("holds the destination, the date range and the tags behind one surface", () => {
    sheet();

    expect(screen.getByText(expensesPage.destination)).toBeDefined();
    expect(screen.getByText(expensesPage.expenseDate)).toBeDefined();
    expect(screen.getByText(expensesPage.tags)).toBeDefined();
    expect(screen.getByText(destinationPicker.anyDestination)).toBeDefined();
    expect(screen.getByText(filterSheet.done)).toBeDefined();
  });

  it("picks a tag without touching the rest", () => {
    const { onChange } = sheet({ destinationId: "act-1" });

    fireEvent.click(screen.getByText("نقل"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tagIds: ["t1"], destinationId: "act-1" }),
    );
  });

  it("keeps the search when the sheet is cleared", () => {
    const { onChange } = sheet({ q: "essence", tagIds: ["t1"] });

    fireEvent.click(screen.getByText(filterSheet.clear));

    expect(onChange).toHaveBeenCalledWith({ ...NO_EXPENSES_FILTERS, q: "essence" });
  });

  it("offers no tag field when the association has no tags", () => {
    render(
      <ExpensesFilterSheet
        filters={NO_EXPENSES_FILTERS}
        destinations={DESTINATIONS}
        tags={[]}
        resultCount={0}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText(expensesPage.tags)).toBeNull();
  });
});

describe("the expenses chips row", () => {
  it("says nothing when nothing is on", () => {
    const { container } = chips();

    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("names the destination, each date and each chosen tag", () => {
    chips({
      destinationId: "act-1",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
      tagIds: ["t1", "t2"],
    });

    expect(screen.getByText("قافلة التاكلالت")).toBeDefined();
    expect(screen.getByText(`${filterSheet.from} 2026-08-01`)).toBeDefined();
    expect(screen.getByText(`${filterSheet.to} 2026-08-31`)).toBeDefined();
    expect(screen.getByText("نقل")).toBeDefined();
    expect(screen.getByText("بناء")).toBeDefined();
  });

  it("drops the one tag whose chip is pressed", () => {
    const { onChange } = chips({ tagIds: ["t1", "t2"] });

    fireEvent.click(screen.getByText("نقل"));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tagIds: ["t2"] }));
  });
});
