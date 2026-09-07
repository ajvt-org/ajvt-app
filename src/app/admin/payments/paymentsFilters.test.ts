import { describe, it, expect } from "vitest";
import {
  NO_ACCOUNT,
  PAYMENTS_FILTER_KEYS,
  accountOptionsOf,
  matchesAccount,
  pageHolding,
  readPaymentsFilters,
  writePaymentsFilters,
} from "./paymentsFilters";

describe("carrying the payments filters in the address", () => {
  it("reads an empty query as no filter at all", () => {
    expect(readPaymentsFilters(new URLSearchParams())).toEqual({
      kind: "ALL",
      q: "",
      account: "",
      focus: "",
    });
  });

  it("writes nothing for the default view", () => {
    expect(writePaymentsFilters({ kind: "ALL", q: "", account: "", focus: "" }).toString()).toBe(
      "",
    );
  });

  it("survives a round trip, which is what a shared link is", () => {
    const chosen = { kind: "DONATION" as const, q: "hello", account: "a1", focus: "p9" };
    expect(
      readPaymentsFilters(new URLSearchParams(writePaymentsFilters(chosen).toString())),
    ).toEqual(chosen);
  });

  it("falls back to ALL for any kind value it does not recognize", () => {
    for (const raw of ["", "BOGUS", "membership", "all"]) {
      expect(readPaymentsFilters(new URLSearchParams(`kind=${raw}`)).kind, raw).toBe("ALL");
    }
  });

  it("accepts each of the three real kinds", () => {
    for (const kind of ["MEMBERSHIP", "ACTIVITY", "DONATION"]) {
      expect(readPaymentsFilters(new URLSearchParams(`kind=${kind}`)).kind).toBe(kind);
    }
  });

  it("lists exactly the keys it owns in the address", () => {
    expect(PAYMENTS_FILTER_KEYS).toEqual(["kind", "q", "account", "focus"]);
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
