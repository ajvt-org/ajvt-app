import { describe, it, expect } from "vitest";
import { matchesSearch } from "./paymentsSearch";
import type { Proof } from "./paymentTypes";

function proofOf(over: Partial<Proof> = {}): Proof {
  return {
    id: "d1",
    kind: "DONATION",
    proof: null,
    memberName: "أحمد ولد محمد",
    activityTitle: null,
    amount: 500,
    status: "ACTIVE",
    paidOn: null,
    submittedAt: "2026-08-20T09:00:00.000Z",
    ...over,
  };
}

const withReceipt = proofOf({ receipt: { number: "R-2026-0167", status: "ACTIVE" } });

describe("searching the payments list", () => {
  it("keeps every row when nothing is typed", () => {
    expect(matchesSearch(proofOf(), "")).toBe(true);
    expect(matchesSearch(proofOf(), "   ")).toBe(true);
  });

  it("finds a payment by the receipt number printed on it", () => {
    expect(matchesSearch(withReceipt, "R-2026-0167")).toBe(true);
  });

  it("finds it without the prefix, which is what people quote", () => {
    expect(matchesSearch(withReceipt, "2026-0167")).toBe(true);
    expect(matchesSearch(withReceipt, "0167")).toBe(true);
  });

  it("finds it whichever case the letter is typed in", () => {
    expect(matchesSearch(withReceipt, "r-2026-0167")).toBe(true);
  });

  it("does not find a payment carrying somebody else's number", () => {
    expect(matchesSearch(withReceipt, "0168")).toBe(false);
  });

  it("does not find a payment with no receipt at all", () => {
    expect(matchesSearch(proofOf(), "0167")).toBe(false);
  });

  it("finds a name written with a hamza from one written without", () => {
    expect(matchesSearch(proofOf(), "احمد")).toBe(true);
  });

  it("finds a name written without a hamza from one written with", () => {
    expect(matchesSearch(proofOf({ memberName: "احمد ولد محمد" }), "أحمد")).toBe(true);
  });

  it("finds a bank reference whichever case it is typed in", () => {
    const row = proofOf({ bankReference: "BNM-4471" });
    expect(matchesSearch(row, "bnm-4471")).toBe(true);
  });

  it("finds a payment by the activity or the competition it went to", () => {
    expect(matchesSearch(proofOf({ activityTitle: "أمسية ثقافية" }), "امسية")).toBe(true);
    expect(matchesSearch(proofOf({ competitionName: "مسابقة القرآن" }), "مسابقه")).toBe(true);
  });

  it("finds a gift by the name typed on it when no account is linked", () => {
    expect(matchesSearch(proofOf({ memberName: "", donorName: "فاطمة" }), "فاطمه")).toBe(true);
  });
});
