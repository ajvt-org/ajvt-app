import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import ActivityRowBody from "./ActivityRowBody";

describe("ActivityRowBody", () => {
  it("gives the title a row of its own above the date and the chips", () => {
    cleanup();
    const { container } = render(
      <ActivityRowBody
        title="بطولة رابطة شباب قرية التاكلالت 2026"
        when="24 - 29 أغسطس"
        chips={<span className="badge">مغلق</span>}
      />,
    );

    const text = container.querySelector(".activity-title") as HTMLElement;
    expect(text.textContent).toBe("بطولة رابطة شباب قرية التاكلالت 2026");
    expect(text.className).not.toContain("truncate");
    expect(text.parentElement?.children).toHaveLength(3);
  });

  it("leaves out the date line when a activity carries no dates", () => {
    cleanup();
    const { container } = render(<ActivityRowBody title="بطولة" />);

    expect(container.querySelector(".activity-title")?.parentElement?.children).toHaveLength(1);
  });

  it("falls back to an icon when there is no poster", () => {
    cleanup();
    const { container } = render(<ActivityRowBody title="حملة" isVolunteer />);

    const thumb = container.querySelector(".activity-thumb") as HTMLElement;
    expect(thumb.tagName.toLowerCase()).toBe("span");
    expect(thumb.querySelector("svg")).not.toBeNull();
  });

  it("takes the icon the caller names over the volunteer default", () => {
    cleanup();
    const { container: named } = render(<ActivityRowBody title="مسابقة" icon="quiz" />);
    const path = named.querySelector(".activity-thumb svg path")?.getAttribute("d");
    cleanup();
    const { container: fallback } = render(<ActivityRowBody title="حملة" isVolunteer />);

    expect(path).not.toBeUndefined();
    expect(path).not.toBe(fallback.querySelector(".activity-thumb svg path")?.getAttribute("d"));
  });

  it("shows the poster when there is one", () => {
    cleanup();
    const { container } = render(<ActivityRowBody title="بطولة" photo="poster.webp" />);

    expect(container.querySelector("img.activity-thumb")).not.toBeNull();
  });

  it("carries an extra note beside the date", () => {
    cleanup();
    const { container } = render(
      <ActivityRowBody title="بطولة" when="سبتمبر" meta={<span>مسجَّل</span>} />,
    );

    expect(container.textContent).toContain("مسجَّل");
  });
});
