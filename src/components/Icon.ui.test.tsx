import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Icon from "./Icon";

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("no svg rendered");
  return svg;
}

describe("Icon", () => {
  it("strokes by default", () => {
    const svg = svgOf(render(<Icon name="heart" />).container);

    expect(svg.getAttribute("stroke")).toBe("currentColor");
    expect(svg.getAttribute("fill")).toBe("none");
  });

  it("paints the path when asked to fill, so a coloured icon reads as coloured", () => {
    const svg = svgOf(render(<Icon name="heart" filled />).container);

    expect(svg.getAttribute("fill")).toBe("currentColor");
    expect(svg.getAttribute("stroke")).toBe("none");
  });

  it("fills a solid-only icon without being asked", () => {
    const svg = svgOf(render(<Icon name="whatsapp" />).container);

    expect(svg.getAttribute("fill")).toBe("currentColor");
  });

  it("fills the captain mark, which is a letterform rather than an outline", () => {
    const svg = svgOf(render(<Icon name="captain" />).container);

    expect(svg.getAttribute("fill")).toBe("currentColor");
    expect(svg.getAttribute("stroke")).toBe("none");
  });

  it("is hidden from assistive technology, since every use carries its own label", () => {
    const svg = svgOf(render(<Icon name="trophy" />).container);

    expect(svg.getAttribute("aria-hidden")).toBe("true");
  });
});
