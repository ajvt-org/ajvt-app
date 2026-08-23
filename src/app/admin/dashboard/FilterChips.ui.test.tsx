import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import FilterChips from "./FilterChips";
import { NO_FILTERS } from "@/lib/memberFilters";

function renderChips(over: Partial<typeof NO_FILTERS>, onChange = vi.fn()) {
  cleanup();
  const filters = { ...NO_FILTERS, ...over };
  render(<FilterChips filters={filters} resultCount={7} onChange={onChange} />);
  return { filters, onChange };
}

describe("FilterChips", () => {
  it("shows one chip per active filter, in words", () => {
    renderChips({ age: "البدريين", paid: "partial", standing: "behind" });

    expect(screen.getByText("البدريين")).toBeDefined();
    expect(screen.getByText("دفع ناقص")).toBeDefined();
    expect(screen.getByText("متأخرون")).toBeDefined();
  });

  it("shows no chips when only the tab and the search are set", () => {
    renderChips({ status: "PENDING", q: "محمد" });

    expect(screen.queryByText(/إزالة/)).toBeNull();
    expect(screen.getByText(/نتائج|نتيجة/)).toBeDefined();
  });

  it("removes just its own filter when a chip is clicked", () => {
    const { onChange } = renderChips({ age: "البدريين", method: "بنكيلي" });

    fireEvent.click(screen.getByText("البدريين"));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ age: "", method: "بنكيلي" }));
  });

  it("clears everything except the tab and the search", () => {
    const { onChange } = renderChips({
      status: "ACTIVE",
      q: "محمد",
      age: "البدريين",
      method: "بنكيلي",
    });

    fireEvent.click(screen.getByText(/إزالة التصفية/));

    expect(onChange).toHaveBeenCalledWith({ ...NO_FILTERS, status: "ACTIVE", q: "محمد" });
  });
});
