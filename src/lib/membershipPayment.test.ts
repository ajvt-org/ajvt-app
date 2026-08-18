import { describe, it, expect } from "vitest";
import { splitPayment, totalPaid, hasSurplus } from "./membershipPayment";

describe("splitPayment", () => {
  it("keeps the whole amount as the fee when it matches", () => {
    expect(splitPayment(100, 100)).toEqual({ fee: 100, surplus: 0 });
  });

  it("sends everything above the fee to the surplus", () => {
    expect(splitPayment(2100, 100)).toEqual({ fee: 100, surplus: 2000 });
  });

  it("never invents a surplus when the member paid short", () => {
    expect(splitPayment(40, 100)).toEqual({ fee: 40, surplus: 0 });
  });

  it("follows the fee it is given rather than a built-in one", () => {
    expect(splitPayment(500, 250)).toEqual({ fee: 250, surplus: 250 });
  });

  it("splits nothing when the total is zero", () => {
    expect(splitPayment(0, 100)).toEqual({ fee: 0, surplus: 0 });
  });

  it("refuses a total that is not a whole number", () => {
    expect(splitPayment(100.5, 100)).toEqual({ fee: 0, surplus: 0 });
    expect(splitPayment(Number.NaN, 100)).toEqual({ fee: 0, surplus: 0 });
  });

  it("refuses negative values", () => {
    expect(splitPayment(-100, 100)).toEqual({ fee: 0, surplus: 0 });
    expect(splitPayment(100, -1)).toEqual({ fee: 0, surplus: 0 });
  });

  it("adds back up to what was paid", () => {
    for (const total of [100, 150, 300, 2100]) {
      expect(totalPaid(splitPayment(total, 100))).toBe(total);
    }
  });
});

describe("hasSurplus", () => {
  it("is true only once the amount rises above the fee", () => {
    expect(hasSurplus(100, 100)).toBe(false);
    expect(hasSurplus(101, 100)).toBe(true);
    expect(hasSurplus(99, 100)).toBe(false);
  });
});
