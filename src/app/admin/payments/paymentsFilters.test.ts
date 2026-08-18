import { describe, it, expect } from "vitest";
import { PAYMENTS_FILTER_KEYS, readPaymentsFilters, writePaymentsFilters } from "./paymentsFilters";

describe("carrying the payments filters in the address", () => {
  it("reads an empty query as no filter at all", () => {
    expect(readPaymentsFilters(new URLSearchParams())).toEqual({ kind: "ALL", q: "" });
  });

  it("writes nothing for the default view", () => {
    expect(writePaymentsFilters({ kind: "ALL", q: "" }).toString()).toBe("");
  });

  it("survives a round trip, which is what a shared link is", () => {
    const chosen = { kind: "DONATION" as const, q: "hello" };
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
    expect(PAYMENTS_FILTER_KEYS).toEqual(["kind", "q"]);
  });
});
