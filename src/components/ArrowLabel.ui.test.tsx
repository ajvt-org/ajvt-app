import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ArrowLabel from "./ArrowLabel";

describe("ArrowLabel", () => {
  it("keeps the label readable", () => {
    render(<ArrowLabel>دخول</ArrowLabel>);

    expect(screen.getByText("دخول")).toBeDefined();
  });

  it("puts the arrow after the label when moving forward", () => {
    const { container } = render(<ArrowLabel>دخول</ArrowLabel>);
    const wrapper = container.firstElementChild!;

    expect(wrapper.lastElementChild?.tagName.toLowerCase()).toBe("svg");
  });

  it("puts the arrow before the label when going back", () => {
    const { container } = render(<ArrowLabel direction="back">الصفحة الرئيسية</ArrowLabel>);
    const wrapper = container.firstElementChild!;

    expect(wrapper.firstElementChild?.tagName.toLowerCase()).toBe("svg");
  });

  it("draws one arrow, never both", () => {
    const { container } = render(<ArrowLabel>دخول</ArrowLabel>);

    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });
});
