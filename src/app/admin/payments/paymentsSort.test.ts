import { describe, it, expect } from "vitest";
import { readPaymentSort, sortPayments } from "./paymentsSort";
import type { Proof } from "./paymentTypes";

function proof(over: Partial<Proof> & { id: string }): Proof {
  return {
    kind: "DONATION",
    proof: null,
    memberName: "متبرع",
    activityTitle: null,
    amount: null,
    status: "ACTIVE",
    paidOn: null,
    submittedAt: "2026-09-01T00:00:00.000Z",
    ...over,
  };
}

const paidInJune = proof({ id: "june", paidOn: "2026-06-10T00:00:00.000Z", amount: 500 });
const paidInJuly = proof({ id: "july", paidOn: "2026-07-10T00:00:00.000Z", amount: 100 });
const noDay = proof({ id: "older", submittedAt: "2026-05-01T00:00:00.000Z", amount: 900 });

const ids = (rows: Proof[]) => rows.map((row) => row.id);

describe("ordering the payments list", () => {
  it("puts the most recent payment first", () => {
    expect(ids(sortPayments([noDay, paidInJune, paidInJuly], "newest"))).toEqual([
      "july",
      "june",
      "older",
    ]);
  });

  it("turns the same order around", () => {
    expect(ids(sortPayments([paidInJuly, noDay, paidInJune], "oldest"))).toEqual([
      "older",
      "june",
      "july",
    ]);
  });

  it("dates a row with no payment day by the day it was recorded", () => {
    const recordedLate = proof({ id: "late", submittedAt: "2026-08-01T00:00:00.000Z" });
    expect(ids(sortPayments([paidInJuly, recordedLate], "newest"))).toEqual(["late", "july"]);
  });

  it("puts the largest amount first", () => {
    expect(ids(sortPayments([paidInJuly, paidInJune, noDay], "largest"))).toEqual([
      "older",
      "june",
      "july",
    ]);
  });

  it("puts the smallest amount first", () => {
    expect(ids(sortPayments([noDay, paidInJune, paidInJuly], "smallest"))).toEqual([
      "july",
      "june",
      "older",
    ]);
  });

  it("keeps a row that carries no amount at the end of either amount order", () => {
    const noAmount = proof({ id: "membership", kind: "MEMBERSHIP", amount: null });
    expect(ids(sortPayments([noAmount, paidInJune], "largest"))).toEqual(["june", "membership"]);
    expect(ids(sortPayments([noAmount, paidInJune], "smallest"))).toEqual(["june", "membership"]);
  });

  it("settles two equal amounts by the most recent payment", () => {
    const same = proof({ id: "same", paidOn: "2026-08-10T00:00:00.000Z", amount: 500 });
    expect(ids(sortPayments([paidInJune, same], "largest"))).toEqual(["same", "june"]);
  });

  it("leaves the list it was given alone", () => {
    const given = [paidInJune, paidInJuly];
    sortPayments(given, "oldest");
    expect(ids(given)).toEqual(["june", "july"]);
  });
});

describe("reading an order out of the address", () => {
  it("takes each order it knows", () => {
    for (const sort of ["newest", "oldest", "largest", "smallest"] as const) {
      expect(readPaymentSort(sort)).toBe(sort);
    }
  });

  it("falls back to the newest first", () => {
    expect(readPaymentSort(null)).toBe("newest");
    expect(readPaymentSort("amount")).toBe("newest");
  });
});
