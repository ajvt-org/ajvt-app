import { describe, it, expect } from "vitest";
import { proofReuseHref, uniqueExpenses } from "./proofReuseRows";

describe("an expense carrying the same image more than once", () => {
  it("is reported once rather than once per justificatif", () => {
    const rows = [
      { id: "e1", label: "one" },
      { id: "e1", label: "one" },
      { id: "e2", label: "two" },
    ];
    expect(uniqueExpenses(rows)).toEqual([
      { id: "e1", label: "one" },
      { id: "e2", label: "two" },
    ]);
  });

  it("keeps the first it saw", () => {
    expect(uniqueExpenses([{ id: "a" }, { id: "b" }])).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("copes with nothing at all", () => {
    expect(uniqueExpenses([])).toEqual([]);
  });
});

describe("the way in to a record the proof is already attached to", () => {
  it("opens a member on their card", () => {
    expect(proofReuseHref("member", "u1", "")).toBe("/admin/members/u1");
  });

  it("opens a payment on the row it names", () => {
    expect(proofReuseHref("donation", "d1", "")).toBe("/admin/payments?focus=d1");
  });

  it("opens an expense on a search for its description", () => {
    expect(proofReuseHref("expense", "e1", "كرات")).toBe(
      `/admin/expenses?q=${encodeURIComponent("كرات")}`,
    );
  });

  it("falls back to the expense list when there is no description to search for", () => {
    expect(proofReuseHref("expense", "e1", "")).toBe("/admin/expenses");
  });
});
