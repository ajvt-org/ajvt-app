import { describe, it, expect } from "vitest";
import { givenAmount, tagIncome } from "./tagIncome";
import { MEMBERSHIP_FEE } from "./donations";

describe("givenAmount", () => {
  it("takes the whole amount of a gift", () => {
    expect(givenAmount({ purpose: "DONATION", amount: 5000, feeApplied: null })).toBe(5000);
    expect(givenAmount({ purpose: "ACTIVITY", amount: 3000, feeApplied: null })).toBe(3000);
  });

  it("takes only what a membership was paid above the fee", () => {
    expect(
      givenAmount({
        purpose: "MEMBERSHIP",
        amount: MEMBERSHIP_FEE + 4000,
        feeApplied: MEMBERSHIP_FEE,
      }),
    ).toBe(4000);
  });
});

describe("tagIncome", () => {
  it("reads nothing off a tag nothing is attached to", () => {
    expect(tagIncome([])).toEqual({ count: 0, total: 0 });
  });

  it("totals the gifts attached to a tag", () => {
    expect(
      tagIncome([
        { purpose: "DONATION", amount: 5000, feeApplied: null },
        { purpose: "ACTIVITY", amount: 3000, feeApplied: null },
      ]),
    ).toEqual({ count: 2, total: 8000 });
  });

  it("counts a membership for what it gave above the fee and not the fee itself", () => {
    expect(
      tagIncome([
        { purpose: "MEMBERSHIP", amount: MEMBERSHIP_FEE + 2000, feeApplied: MEMBERSHIP_FEE },
      ]),
    ).toEqual({ count: 1, total: 2000 });
  });

  it("leaves out a membership paid at the fee, which gave nothing", () => {
    expect(
      tagIncome([{ purpose: "MEMBERSHIP", amount: MEMBERSHIP_FEE, feeApplied: MEMBERSHIP_FEE }]),
    ).toEqual({ count: 0, total: 0 });
  });

  it("counts a gift recorded with no amount as a gift of nothing", () => {
    expect(tagIncome([{ purpose: "DONATION", amount: 0, feeApplied: null }])).toEqual({
      count: 1,
      total: 0,
    });
  });
});
