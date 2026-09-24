import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NO_FILTERS, type MemberFilters } from "@/lib/memberFilters";
import { MEMBER_SORT_LABEL, filterSheet } from "@/lib/texts";
import MembersFilterRow from "./MembersFilterRow";

function renderRow(over: Partial<MemberFilters> = {}) {
  const onChange = vi.fn();
  render(
    <MembersFilterRow
      filters={{ ...NO_FILTERS, ...over }}
      villages={[{ id: "v1", name: "أفجار" }]}
      ageGroups={[{ id: "g1", name: "البدريين" }]}
      paymentMethods={["بنكيلي", "نقداً"]}
      onChange={onChange}
    />,
  );
  return onChange;
}

describe("the filters on the members page", () => {
  it("carries village, age group, method and the dates", () => {
    renderRow();

    expect(screen.getByRole("button", { name: filterSheet.byVillage })).toBeDefined();
    expect(screen.getByRole("button", { name: filterSheet.byAge })).toBeDefined();
    expect(screen.getByLabelText(filterSheet.byMethod)).toBeDefined();
    expect(screen.getByLabelText(filterSheet.from)).toBeDefined();
    expect(screen.getByLabelText(filterSheet.to)).toBeDefined();
  });

  it("offers the payment method and not the amount paid", () => {
    renderRow();

    expect(screen.queryByLabelText(filterSheet.byPaid)).toBeNull();
  });

  it("adds a village to the ones already chosen", () => {
    const onChange = renderRow({ village: ["التاكلالت"], method: "بنكيلي" });

    fireEvent.click(screen.getByRole("button", { name: filterSheet.byVillage }));
    fireEvent.click(screen.getByRole("checkbox", { name: "أفجار" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ village: ["التاكلالت", "أفجار"], method: "بنكيلي" }),
    );
  });

  it("picks an age group", () => {
    const onChange = renderRow();

    fireEvent.click(screen.getByRole("button", { name: filterSheet.byAge }));
    fireEvent.click(screen.getByRole("checkbox", { name: "البدريين" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ age: ["البدريين"] }));
  });

  it("picks a payment method and keeps the rest", () => {
    const onChange = renderRow({ age: ["البدريين"] });

    fireEvent.change(screen.getByLabelText(filterSheet.byMethod), { target: { value: "نقداً" } });

    expect(onChange).toHaveBeenCalledWith({ ...NO_FILTERS, age: ["البدريين"], method: "نقداً" });
  });

  it("sets the start of the range", () => {
    const onChange = renderRow();

    fireEvent.change(screen.getByLabelText(filterSheet.from), { target: { value: "2026-03-01" } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ from: "2026-03-01" }));
  });

  it("shows what the url already holds", () => {
    renderRow({ method: "بنكيلي", from: "2026-03-01", village: ["أفجار"] });

    expect((screen.getByLabelText(filterSheet.byMethod) as HTMLSelectElement).value).toBe("بنكيلي");
    expect((screen.getByLabelText(filterSheet.from) as HTMLInputElement).value).toBe("2026-03-01");
    expect(screen.getByRole("button", { name: filterSheet.byVillage }).textContent).toContain(
      "أفجار",
    );
  });

  it("offers the review order and both name orders, review first", () => {
    renderRow();

    const sort = screen.getByLabelText(filterSheet.sortBy) as HTMLSelectElement;
    expect([...sort.options].map((o) => o.textContent)).toEqual([
      MEMBER_SORT_LABEL.review,
      MEMBER_SORT_LABEL.az,
      MEMBER_SORT_LABEL.za,
    ]);
    expect(sort.value).toBe("review");
  });

  it("orders by name and keeps the filters", () => {
    const onChange = renderRow({ village: ["أفجار"] });

    fireEvent.change(screen.getByLabelText(filterSheet.sortBy), { target: { value: "az" } });

    expect(onChange).toHaveBeenCalledWith({ ...NO_FILTERS, village: ["أفجار"], sort: "az" });
  });
});
