import { describe, it, expect } from "vitest";
import { halvesLabel, halvesText } from "./halfPoints";

describe("halvesText", () => {
  it("writes a whole number of parts as a whole number", () => {
    expect(halvesText(0)).toBe("0");
    expect(halvesText(2)).toBe("1");
    expect(halvesText(6)).toBe("3");
  });

  it("writes a half as a half, not as a decimal and not rounded", () => {
    expect(halvesText(1)).toBe("½");
    expect(halvesText(3)).toBe("1½");
    expect(halvesText(5)).toBe("2½");
  });

  it("writes a side that owes parts as a negative", () => {
    expect(halvesText(-2)).toBe("−1");
    expect(halvesText(-1)).toBe("−½");
    expect(halvesText(-3)).toBe("−1½");
  });
});

describe("halvesLabel", () => {
  it("wraps the number so a minus sign keeps its place in a right to left line", () => {
    expect(halvesLabel(-3)).toBe("⁨−1½⁩");
  });

  it("wraps a positive number the same way, so every total reads alike", () => {
    expect(halvesLabel(2)).toBe("⁨1⁩");
  });
});
