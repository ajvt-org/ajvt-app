import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import IconLabel from "./IconLabel";

describe("IconLabel", () => {
  it("leads with the icon by default", () => {
    cleanup();
    const { container } = render(<IconLabel name="ball">الهدافون</IconLabel>);

    const label = container.firstElementChild as HTMLElement;
    expect(label.firstElementChild?.tagName.toLowerCase()).toBe("svg");
  });

  it("puts the icon last so a count reads first in Arabic", () => {
    cleanup();
    const { container } = render(
      <IconLabel name="ball" after>
        3
      </IconLabel>,
    );

    const label = container.firstElementChild as HTMLElement;
    expect(label.lastElementChild?.tagName.toLowerCase()).toBe("svg");
    expect(label.textContent).toBe("3");
  });

  it("lifts the icon onto a count's centre line", () => {
    cleanup();
    const { container } = render(
      <IconLabel name="ball" after>
        3
      </IconLabel>,
    );

    expect(container.querySelector("svg")?.getAttribute("class")).toBe("icon-label-numeral");
  });

  it("centers the icon on its label instead of nudging it off the baseline", () => {
    cleanup();
    const { container } = render(<IconLabel name="ball">الهدافون</IconLabel>);

    const label = container.firstElementChild as HTMLElement;
    expect(label.className).toContain("items-center");
    expect(container.querySelector("svg")?.getAttribute("class")).toBeNull();
  });
});
