import { describe, it, expect } from "vitest";
import { surplusForYear, paidBreakdown } from "./paidBreakdown";

describe("surplusForYear", () => {
  it("counts only the rows belonging to that year", () => {
    const rows = [
      { amount: 400, membershipYear: 2025 },
      { amount: 900, membershipYear: 2026 },
    ];

    expect(surplusForYear(rows, 2026)).toBe(900);
    expect(surplusForYear(rows, 2025)).toBe(400);
  });

  it("is zero when the year carries nothing", () => {
    expect(surplusForYear([{ amount: 400, membershipYear: 2025 }], 2026)).toBe(0);
    expect(surplusForYear([], 2026)).toBe(0);
  });

  it("ignores a row left without a year", () => {
    expect(surplusForYear([{ amount: 400, membershipYear: null }], 2026)).toBe(0);
  });

  it("treats a missing amount as nothing given", () => {
    expect(surplusForYear([{ amount: null, membershipYear: 2026 }], 2026)).toBe(0);
  });
});

describe("paidBreakdown", () => {
  it("says nothing at all when no fee was recorded", () => {
    expect(paidBreakdown(null, 0)).toBeNull();
  });

  it("reports the fee on its own when nothing was given above it", () => {
    expect(paidBreakdown(100, 0)).toEqual({ fee: 100, support: 0, total: 100 });
  });

  it("adds the support back to reach what was transferred", () => {
    expect(paidBreakdown(100, 2000)).toEqual({ fee: 100, support: 2000, total: 2100 });
  });

  it("refuses to report a negative amount", () => {
    expect(paidBreakdown(-5, -5)).toEqual({ fee: 0, support: 0, total: 0 });
  });
});
