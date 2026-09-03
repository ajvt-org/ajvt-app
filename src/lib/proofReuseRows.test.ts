import { describe, it, expect } from "vitest";
import { uniqueExpenses } from "./proofReuseRows";

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
