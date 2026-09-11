import { describe, it, expect } from "vitest";
import {
  NO_ACCOUNT,
  NO_PAYMENTS_FILTERS,
  PAYMENTS_FILTER_KEYS,
  accountOptionsOf,
  activePaymentsFilterCount,
  matchesAccount,
  matchesPaymentsFilters,
  pageHolding,
  readPaymentsFilters,
  writePaymentsFilters,
} from "./paymentsFilters";
import type { Proof } from "./paymentTypes";
import type { PaymentsFilters } from "./paymentsFilters";

describe("carrying the payments filters in the address", () => {
  it("reads an empty query as no filter at all", () => {
    expect(readPaymentsFilters(new URLSearchParams())).toEqual(NO_PAYMENTS_FILTERS);
  });

  it("writes nothing for the default view", () => {
    expect(writePaymentsFilters(NO_PAYMENTS_FILTERS).toString()).toBe("");
  });

  it("survives a round trip, which is what a shared link is", () => {
    const chosen = {
      ...NO_PAYMENTS_FILTERS,
      kind: "DONATION" as const,
      q: "hello",
      status: "PENDING",
      account: "a1",
      from: "2026-06-01",
      to: "2026-06-30",
      receipt: "with",
      linked: "no",
      sort: "largest" as const,
      focus: "p9",
    };
    expect(
      readPaymentsFilters(new URLSearchParams(writePaymentsFilters(chosen).toString())),
    ).toEqual(chosen);
  });

  it("falls back to ALL for any kind value it does not recognize", () => {
    for (const raw of ["", "BOGUS", "membership", "all"]) {
      expect(readPaymentsFilters(new URLSearchParams(`kind=${raw}`)).kind, raw).toBe("ALL");
    }
  });

  it("falls back to the newest first for any order it does not recognize", () => {
    for (const raw of ["", "BOGUS", "Newest", "date"]) {
      expect(readPaymentsFilters(new URLSearchParams(`sort=${raw}`)).sort, raw).toBe("newest");
    }
  });

  it("accepts each of the three real kinds", () => {
    for (const kind of ["MEMBERSHIP", "ACTIVITY", "DONATION"]) {
      expect(readPaymentsFilters(new URLSearchParams(`kind=${kind}`)).kind).toBe(kind);
    }
  });

  it("lists exactly the keys it owns in the address", () => {
    expect(PAYMENTS_FILTER_KEYS).toEqual([
      "kind",
      "q",
      "status",
      "account",
      "from",
      "to",
      "receipt",
      "linked",
      "sort",
      "focus",
    ]);
  });
});

describe("finding the page a single row is on", () => {
  const ids = Array.from({ length: 7 }, (_, i) => `p${i}`);

  it("has no page to go to when nothing is being pointed at", () => {
    expect(pageHolding(ids, "", 3)).toBeNull();
  });

  it("finds the first page for a row near the top", () => {
    expect(pageHolding(ids, "p0", 3)).toBe(1);
    expect(pageHolding(ids, "p2", 3)).toBe(1);
  });

  it("finds a later page for a row further down", () => {
    expect(pageHolding(ids, "p3", 3)).toBe(2);
    expect(pageHolding(ids, "p6", 3)).toBe(3);
  });

  it("has no page for a row the filters have taken out", () => {
    expect(pageHolding(ids, "gone", 3)).toBeNull();
  });
});

describe("filtering the payments list by the number money landed in", () => {
  const on = (id: string, code: string) => ({ accountId: id, account: { id, code, label: null } });
  const none = { accountId: null, account: null };

  it("keeps everything when no number is chosen", () => {
    expect(matchesAccount(on("a1", "111111"), "")).toBe(true);
    expect(matchesAccount(none, "")).toBe(true);
  });

  it("keeps only what landed in the chosen number", () => {
    expect(matchesAccount(on("a1", "111111"), "a1")).toBe(true);
    expect(matchesAccount(on("a2", "222222"), "a1")).toBe(false);
    expect(matchesAccount(none, "a1")).toBe(false);
  });

  it("keeps only what landed nowhere anybody knows", () => {
    expect(matchesAccount(none, NO_ACCOUNT)).toBe(true);
    expect(matchesAccount(on("a1", "111111"), NO_ACCOUNT)).toBe(false);
  });

  it("offers every number the rows point at, once each", () => {
    const options = accountOptionsOf([
      on("a2", "222222"),
      on("a1", "111111"),
      on("a1", "111111"),
      none,
    ]);
    expect(options).toEqual([
      { id: "a1", code: "111111" },
      { id: "a2", code: "222222" },
    ]);
  });

  it("offers none when nothing points anywhere", () => {
    expect(accountOptionsOf([none])).toEqual([]);
  });
});

describe("narrowing the payments list by more than a word", () => {
  const proofOf = (over: Partial<Proof> = {}): Proof => ({
    id: "d1",
    kind: "DONATION",
    proof: null,
    memberName: "متبرع",
    activityTitle: null,
    amount: 500,
    status: "ACTIVE",
    paidOn: "2026-06-15T12:00:00.000Z",
    submittedAt: "2026-08-01T09:00:00.000Z",
    ...over,
  });

  const on = (over: Partial<PaymentsFilters>) => ({ ...NO_PAYMENTS_FILTERS, ...over });

  it("keeps every row when nothing is chosen", () => {
    expect(matchesPaymentsFilters(proofOf(), NO_PAYMENTS_FILTERS)).toBe(true);
  });

  it("keeps only the state that was asked for", () => {
    expect(matchesPaymentsFilters(proofOf(), on({ status: "ACTIVE" }))).toBe(true);
    expect(matchesPaymentsFilters(proofOf(), on({ status: "PENDING" }))).toBe(false);
  });

  it("reads a period against the day the money moved", () => {
    expect(matchesPaymentsFilters(proofOf(), on({ from: "2026-06-01", to: "2026-06-30" }))).toBe(
      true,
    );
    expect(matchesPaymentsFilters(proofOf(), on({ from: "2026-07-01" }))).toBe(false);
    expect(matchesPaymentsFilters(proofOf(), on({ to: "2026-06-01" }))).toBe(false);
  });

  it("reads a period against the recording day where no payment day is known", () => {
    const older = proofOf({ paidOn: null });
    expect(matchesPaymentsFilters(older, on({ from: "2026-08-01", to: "2026-08-31" }))).toBe(true);
    expect(matchesPaymentsFilters(older, on({ from: "2026-06-01", to: "2026-06-30" }))).toBe(false);
  });

  it("separates what carries a receipt from what does not", () => {
    const paper = proofOf({ receipt: { number: "R-2026-0167", status: "ACTIVE" } });
    expect(matchesPaymentsFilters(paper, on({ receipt: "with" }))).toBe(true);
    expect(matchesPaymentsFilters(paper, on({ receipt: "without" }))).toBe(false);
    expect(matchesPaymentsFilters(proofOf(), on({ receipt: "without" }))).toBe(true);
  });

  it("separates what is linked to a member from what is not", () => {
    const linked = proofOf({ userId: "u1" });
    expect(matchesPaymentsFilters(linked, on({ linked: "yes" }))).toBe(true);
    expect(matchesPaymentsFilters(linked, on({ linked: "no" }))).toBe(false);
    expect(matchesPaymentsFilters(proofOf(), on({ linked: "no" }))).toBe(true);
  });

  it("takes every chosen field together, not one at a time", () => {
    const row = proofOf({ userId: "u1", status: "PENDING" });
    expect(matchesPaymentsFilters(row, on({ status: "PENDING", linked: "yes" }))).toBe(true);
    expect(matchesPaymentsFilters(row, on({ status: "PENDING", linked: "no" }))).toBe(false);
  });
});

describe("counting what is narrowing the list", () => {
  it("counts nothing on an untouched screen", () => {
    expect(activePaymentsFilterCount(NO_PAYMENTS_FILTERS)).toBe(0);
  });

  it("counts each chosen field once", () => {
    expect(
      activePaymentsFilterCount({
        ...NO_PAYMENTS_FILTERS,
        kind: "DONATION",
        status: "ACTIVE",
        from: "2026-06-01",
      }),
    ).toBe(3);
  });

  it("counts neither the search box nor the chosen order, which are not filters", () => {
    expect(activePaymentsFilterCount({ ...NO_PAYMENTS_FILTERS, q: "أحمد", sort: "largest" })).toBe(
      0,
    );
  });
});

describe("which tab one payment is listed under", () => {
  const membership = (over: Partial<Proof> = {}): Proof => ({
    id: "u1",
    kind: "MEMBERSHIP",
    proof: null,
    memberName: "محمد ولد أحمد",
    activityTitle: null,
    amount: 2000,
    feeApplied: 1000,
    year: 2026,
    status: "ACTIVE",
    paidOn: null,
    submittedAt: "2026-08-01T09:00:00.000Z",
    ...over,
  });

  const on = (over: Partial<PaymentsFilters>) => ({ ...NO_PAYMENTS_FILTERS, ...over });

  it("lists a membership payment above the fee under memberships", () => {
    expect(matchesPaymentsFilters(membership(), on({ kind: "MEMBERSHIP" }))).toBe(true);
  });

  it("leaves that same payment off the support tab, where it was never a second payment", () => {
    expect(matchesPaymentsFilters(membership(), on({ kind: "DONATION" }))).toBe(false);
  });

  it("keeps a support payment off the membership tab", () => {
    const donation = membership({ kind: "DONATION", feeApplied: undefined });
    expect(matchesPaymentsFilters(donation, on({ kind: "MEMBERSHIP" }))).toBe(false);
  });

  it("keeps a support payment on the support tab", () => {
    const donation = membership({ kind: "DONATION", feeApplied: undefined });
    expect(matchesPaymentsFilters(donation, on({ kind: "DONATION" }))).toBe(true);
  });

  it("lists every payment under all", () => {
    expect(matchesPaymentsFilters(membership(), on({ kind: "ALL" }))).toBe(true);
  });
});
