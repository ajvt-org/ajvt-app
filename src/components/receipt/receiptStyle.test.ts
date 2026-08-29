import { describe, it, expect } from "vitest";
import { HALF_WIDTH, SHEET_DIVIDER, SHEET_PADDING, SHEET_WIDTH } from "./receiptStyle";

describe("the two up receipt sheet", () => {
  it("fits both halves and the divider inside the paper", () => {
    const usable = SHEET_WIDTH - 2 * SHEET_PADDING;

    expect(2 * HALF_WIDTH + SHEET_DIVIDER).toBeLessThanOrEqual(usable);
  });

  it("wastes no more than a hair of that width", () => {
    const usable = SHEET_WIDTH - 2 * SHEET_PADDING;

    expect(usable - (2 * HALF_WIDTH + SHEET_DIVIDER)).toBeLessThan(2);
  });

  it("keeps the paper at A4 in css pixels", () => {
    expect(SHEET_WIDTH).toBe(794);
  });
});
