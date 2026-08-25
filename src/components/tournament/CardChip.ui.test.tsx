import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import CardChip from "./CardChip";

describe("CardChip", () => {
  it("reads the count before the card in Arabic", () => {
    cleanup();
    const { container } = render(<CardChip type="YELLOW" count={2} />);

    const chip = container.firstElementChild as HTMLElement;
    expect(chip.textContent).toBe("2");
    expect(chip.lastElementChild?.getAttribute("aria-label")).toBe("بطاقة صفراء");
  });

  it("shows the card alone when there is nothing to count", () => {
    cleanup();
    const { container } = render(<CardChip type="RED" />);

    const chip = container.firstElementChild as HTMLElement;
    expect(chip.textContent).toBe("");
    expect(chip.childElementCount).toBe(1);
  });
});
