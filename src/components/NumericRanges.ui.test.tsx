import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import NumericRanges from "./NumericRanges";

function isolated(text: string) {
  const { container } = render(<NumericRanges>{text}</NumericRanges>);
  return Array.from(container.querySelectorAll('span[dir="ltr"]')).map((el) => el.textContent);
}

describe("NumericRanges", () => {
  it("isolates a range written with spaces, the one that reads backwards", () => {
    expect(isolated("24 - 29 أغسطس")).toEqual(["24 - 29"]);
  });

  it("isolates an en dash range, neutral even without spaces", () => {
    expect(isolated("24–29 أغسطس")).toEqual(["24–29"]);
  });

  it("isolates a tight hyphen range too, so the markup does not depend on typing", () => {
    expect(isolated("24-29 أغسطس")).toEqual(["24-29"]);
  });

  it("isolates a slash range", () => {
    expect(isolated("5/32 مشارك")).toEqual(["5/32"]);
  });

  it("leaves a single number alone", () => {
    expect(isolated("يوم 24 أغسطس")).toEqual([]);
  });

  it("handles more than one range in the same text", () => {
    expect(isolated("24 - 29 أغسطس و 3 - 5 سبتمبر")).toEqual(["24 - 29", "3 - 5"]);
  });

  it("keeps the whole text, nothing is dropped", () => {
    const { container } = render(<NumericRanges>{"من 24 - 29 أغسطس 2026"}</NumericRanges>);
    expect(container.textContent).toBe("من 24 - 29 أغسطس 2026");
  });

  it("survives text with no digits at all", () => {
    const { container } = render(<NumericRanges>{"كل يوم جمعة"}</NumericRanges>);
    expect(container.textContent).toBe("كل يوم جمعة");
  });
});
