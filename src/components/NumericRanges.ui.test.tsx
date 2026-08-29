import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import NumericRanges from "./NumericRanges";

function ranges(text: string) {
  const { container } = render(<NumericRanges>{text}</NumericRanges>);
  return Array.from(container.querySelectorAll('span[dir="rtl"]')).map((el) => el.textContent);
}

function fractions(text: string) {
  const { container } = render(<NumericRanges>{text}</NumericRanges>);
  return Array.from(container.querySelectorAll('span[dir="ltr"]')).map((el) => el.textContent);
}

function numbersIsolated(text: string) {
  const { container } = render(<NumericRanges>{text}</NumericRanges>);
  return Array.from(container.querySelectorAll("bdi")).map((el) => el.textContent);
}

describe("NumericRanges", () => {
  it("lets a spaced range take the direction of the sentence", () => {
    expect(ranges("24 - 29 أغسطس")).toEqual(["24 - 29"]);
  });

  it("does the same for an en dash", () => {
    expect(ranges("24–29 أغسطس")).toEqual(["24–29"]);
  });

  it("does the same for a tight hyphen, which binds the numbers if left alone", () => {
    expect(ranges("24-29 أغسطس")).toEqual(["24-29"]);
  });

  it("isolates each number so the separator does not bind them", () => {
    expect(numbersIsolated("24-29 أغسطس")).toEqual(["24", "29"]);
  });

  it("keeps a time range in sentence order too", () => {
    expect(ranges("17:00 - 18:00")).toEqual(["17:00 - 18:00"]);
  });

  it("leaves a slash going left to right", () => {
    expect(fractions("5/32 مشارك")).toEqual(["5/32"]);
    expect(ranges("5/32 مشارك")).toEqual([]);
  });

  it("leaves a single number alone", () => {
    expect(ranges("يوم 24 أغسطس")).toEqual([]);
    expect(numbersIsolated("يوم 24 أغسطس")).toEqual([]);
  });

  it("handles more than one range in the same text", () => {
    expect(ranges("24 - 29 أغسطس و 3 - 5 سبتمبر")).toEqual(["24 - 29", "3 - 5"]);
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
