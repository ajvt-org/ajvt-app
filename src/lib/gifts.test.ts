import { describe, it, expect } from "vitest";
import { sourceOnRecord, givenAmount, memberGifts, type GiftPayment } from "./gifts";
import { MEMBERSHIP_FEE } from "./donations";

const AT = new Date("2026-03-01T10:00:00Z");

function payment(over: Partial<GiftPayment> = {}): GiftPayment {
  return {
    id: "p1",
    purpose: "DONATION",
    amount: 5000,
    feeApplied: null,
    status: "ACTIVE",
    source: "SELF",
    method: "بنكيلي",
    createdAt: AT,
    ...over,
  };
}

describe("sourceOnRecord", () => {
  it("hands back the arrival the payment carries", () => {
    expect(sourceOnRecord("DONATION", "PUBLIC")).toBe("PUBLIC");
    expect(sourceOnRecord("DONATION", "SELF")).toBe("SELF");
    expect(sourceOnRecord("ACTIVITY", "SELF")).toBe("SELF");
  });

  it("reads a membership off its purpose, which records no arrival of its own", () => {
    expect(sourceOnRecord("MEMBERSHIP", null)).toBe("MEMBERSHIP");
  });

  it("reports a gift with no recorded arrival as unrecorded", () => {
    expect(sourceOnRecord("DONATION", null)).toBe("UNRECORDED");
    expect(sourceOnRecord("ACTIVITY", null)).toBe("UNRECORDED");
  });
});

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

  it("reads nothing off a membership paid at the fee", () => {
    expect(
      givenAmount({ purpose: "MEMBERSHIP", amount: MEMBERSHIP_FEE, feeApplied: MEMBERSHIP_FEE }),
    ).toBe(0);
  });
});

describe("memberGifts", () => {
  it("keeps a gift whole and names how it arrived", () => {
    expect(memberGifts([payment()])).toEqual([
      {
        id: "p1",
        amount: 5000,
        status: "ACTIVE",
        source: "SELF",
        paymentMethod: "بنكيلي",
        createdAt: AT,
      },
    ]);
  });

  it("lists a membership surplus, showing the surplus and not the whole payment", () => {
    const [gift] = memberGifts([
      payment({
        purpose: "MEMBERSHIP",
        amount: MEMBERSHIP_FEE + 4000,
        feeApplied: MEMBERSHIP_FEE,
        source: null,
      }),
    ]);

    expect(gift.amount).toBe(4000);
    expect(gift.source).toBe("MEMBERSHIP");
  });

  it("leaves out a membership paid at the fee, which gave nothing", () => {
    expect(
      memberGifts([
        payment({
          purpose: "MEMBERSHIP",
          amount: MEMBERSHIP_FEE,
          feeApplied: MEMBERSHIP_FEE,
          source: null,
        }),
      ]),
    ).toEqual([]);
  });

  it("keeps a rejected gift on the list", () => {
    expect(memberGifts([payment({ status: "REJECTED" })])).toHaveLength(1);
  });

  it("puts the most recent first", () => {
    const rows = memberGifts([
      payment({ id: "old", createdAt: new Date("2026-01-01T00:00:00Z") }),
      payment({ id: "new", createdAt: new Date("2026-06-01T00:00:00Z") }),
    ]);

    expect(rows.map((gift) => gift.id)).toEqual(["new", "old"]);
  });

  it("says a gift with no recorded arrival is unrecorded", () => {
    expect(memberGifts([payment({ source: null })])[0].source).toBe("UNRECORDED");
  });
});
