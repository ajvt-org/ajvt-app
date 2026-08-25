import { describe, it, expect } from "vitest";
import { treasuryOf, UNSPECIFIED_METHOD, type TreasuryPayment } from "./treasury";

function membership(
  amount: number,
  fee: number,
  method: string | null = "بنكيلي",
): TreasuryPayment {
  return { amount, purpose: "MEMBERSHIP", feeApplied: fee, method };
}

function donation(amount: number, method: string | null = "نقداً"): TreasuryPayment {
  return { amount, purpose: "DONATION", feeApplied: null, method };
}

describe("treasuryOf", () => {
  it("is what came in less what went out", () => {
    expect(treasuryOf([donation(1000), donation(500)], 300).balance).toBe(1200);
  });

  it("goes negative when the spending runs past the income", () => {
    expect(treasuryOf([donation(100)], 400).balance).toBe(-300);
  });

  it("is empty with nothing recorded", () => {
    expect(treasuryOf([], 0)).toMatchObject({ balance: 0, income: 0, spending: 0 });
  });

  it("splits a membership payment into the fee and what was given on top", () => {
    const t = treasuryOf([membership(1500, 1000)], 0);

    expect(t.fees).toBe(1000);
    expect(t.support).toBe(500);
    expect(t.income).toBe(1500);
  });

  it("counts a membership payment short of the fee as fee only", () => {
    const t = treasuryOf([membership(600, 1000)], 0);

    expect(t.fees).toBe(600);
    expect(t.support).toBe(0);
  });

  it("counts anything that is not a membership as support", () => {
    expect(treasuryOf([donation(700)], 0)).toMatchObject({ fees: 0, support: 700 });
  });

  it("gathers the income under each method", () => {
    const t = treasuryOf(
      [donation(300, "نقداً"), donation(200, "نقداً"), membership(1000, 1000)],
      0,
    );

    expect(t.byMethod).toContainEqual({ method: "نقداً", amount: 500 });
    expect(t.byMethod).toContainEqual({ method: "بنكيلي", amount: 1000 });
  });

  it("names the method of a payment recorded without one", () => {
    const t = treasuryOf([donation(300, null)], 0);

    expect(t.byMethod).toEqual([{ method: UNSPECIFIED_METHOD, amount: 300 }]);
  });

  it("treats a blank method the same way", () => {
    const t = treasuryOf([donation(300, "  ")], 0);

    expect(t.byMethod).toEqual([{ method: UNSPECIFIED_METHOD, amount: 300 }]);
  });

  it("lists the methods in the order the app offers them", () => {
    const t = treasuryOf([donation(100, "نقداً"), donation(900, "بنكيلي")], 0, ["بنكيلي", "نقداً"]);

    expect(t.byMethod.map((r) => r.method)).toEqual(["بنكيلي", "نقداً"]);
  });

  it("puts an unknown method after the ones it knows", () => {
    const t = treasuryOf([donation(900, "شيك"), donation(100, "بنكيلي")], 0, ["بنكيلي"]);

    expect(t.byMethod.map((r) => r.method)).toEqual(["بنكيلي", "شيك"]);
  });
});
