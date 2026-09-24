import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FilterRow from "./FilterRow";

describe("FilterRow", () => {
  it("lays the pickers out in as many columns as there are pickers", () => {
    const { container } = render(
      <FilterRow pickers={[<span key="a">أ</span>, <span key="b">ب</span>]} />,
    );

    const grid = container.querySelector(".grid") as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe("repeat(2, minmax(0, 1fr))");
  });

  it("puts each wider control on its own span", () => {
    render(
      <FilterRow>
        <span>من</span>
        <span>مبلغ</span>
      </FilterRow>,
    );

    expect(screen.getByText("من").parentElement).not.toBe(screen.getByText("مبلغ").parentElement);
  });

  it("draws no picker grid when it has no pickers", () => {
    const { container } = render(
      <FilterRow>
        <span>من</span>
      </FilterRow>,
    );

    expect(container.querySelector(".grid")).toBeNull();
  });
});
