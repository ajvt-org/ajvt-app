import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import IconLabel from "./IconLabel";

function show(node: React.ReactElement) {
  cleanup();
  const { container } = render(node);
  return {
    label: container.firstElementChild as HTMLElement,
    icon: container.querySelector("svg") as SVGElement,
  };
}

describe("IconLabel", () => {
  it("leads with the icon by default", () => {
    const { label } = show(<IconLabel name="ball">الهدافون</IconLabel>);

    expect(label.firstElementChild?.tagName.toLowerCase()).toBe("svg");
  });

  it("puts the icon last so a count reads first in Arabic", () => {
    const { label } = show(
      <IconLabel name="ball" after>
        3
      </IconLabel>,
    );

    expect(label.lastElementChild?.tagName.toLowerCase()).toBe("svg");
    expect(label.textContent).toBe("3");
  });

  it("lifts a leading icon onto the label's optical centre", () => {
    const { icon, label } = show(<IconLabel name="ball">الهدافون</IconLabel>);

    expect(icon.getAttribute("class")).toBe("icon-label-optical");
    expect(label.className).toContain("items-center");
  });

  it("lifts a trailing icon the same way", () => {
    const { icon } = show(
      <IconLabel name="ball" after>
        3
      </IconLabel>,
    );

    expect(icon.getAttribute("class")).toBe("icon-label-optical");
  });

  it("leaves the ordering as the only thing after decides", () => {
    const leading = show(<IconLabel name="star">الهدافون</IconLabel>);
    const leadingIcon = leading.icon.outerHTML;
    const trailing = show(
      <IconLabel name="star" after>
        الهدافون
      </IconLabel>,
    );

    expect(trailing.icon.outerHTML).toBe(leadingIcon);
    expect(trailing.label.className).toBe(leading.label.className);
    expect(trailing.label.textContent).toBe(leading.label.textContent);
    expect(trailing.label.lastElementChild?.tagName.toLowerCase()).toBe("svg");
  });
});
