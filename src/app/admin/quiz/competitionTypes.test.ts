import { describe, it, expect } from "vitest";
import { toTimeValue, fromTimeValue } from "./competitionTypes";

describe("time values on the competition form", () => {
  it("shows minutes past midnight as a clock time", () => {
    expect(toTimeValue(0)).toBe("00:00");
    expect(toTimeValue(480)).toBe("08:00");
    expect(toTimeValue(1320)).toBe("22:00");
    expect(toTimeValue(1439)).toBe("23:59");
  });

  it("reads a clock time back to minutes", () => {
    expect(fromTimeValue("08:00")).toBe(480);
    expect(fromTimeValue("22:30")).toBe(1350);
  });

  it("round trips", () => {
    for (const m of [0, 75, 480, 1320, 1439]) {
      expect(fromTimeValue(toTimeValue(m))).toBe(m);
    }
  });

  it("treats an unreadable time as midnight rather than throwing", () => {
    expect(fromTimeValue("")).toBe(0);
    expect(fromTimeValue("nonsense")).toBe(0);
  });
});
