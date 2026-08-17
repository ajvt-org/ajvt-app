import { describe, it, expect } from "vitest";
import {
  sortLedger,
  withRunningBalance,
  ledgerTotals,
  type LedgerInput,
} from "@/lib/activityLedger";

const row = (over: Partial<LedgerInput> = {}): LedgerInput => ({
  id: "a",
  kind: "income",
  label: "تبرع",
  amount: 100,
  date: "2026-03-01",
  ...over,
});

describe("sortLedger", () => {
  it("orders by date, oldest first", () => {
    const sorted = sortLedger([
      row({ id: "late", date: "2026-03-10" }),
      row({ id: "early", date: "2026-03-01" }),
    ]);

    expect(sorted.map((r) => r.id)).toEqual(["early", "late"]);
  });

  it("breaks a tie on the same day by id, so the order is stable", () => {
    const sorted = sortLedger([row({ id: "b" }), row({ id: "a" })]);

    expect(sorted.map((r) => r.id)).toEqual(["a", "b"]);
  });
});

describe("withRunningBalance", () => {
  it("adds income and subtracts spending as it goes", () => {
    const entries = withRunningBalance([
      row({ id: "a", kind: "income", amount: 500, date: "2026-03-01" }),
      row({ id: "b", kind: "expense", amount: 200, date: "2026-03-02" }),
      row({ id: "c", kind: "income", amount: 100, date: "2026-03-03" }),
    ]);

    expect(entries.map((e) => e.balance)).toEqual([500, 300, 400]);
  });

  it("goes negative when spending runs ahead of income", () => {
    const entries = withRunningBalance([
      row({ id: "a", kind: "expense", amount: 300, date: "2026-03-01" }),
      row({ id: "b", kind: "income", amount: 100, date: "2026-03-02" }),
    ]);

    expect(entries.map((e) => e.balance)).toEqual([-300, -200]);
  });

  it("has nothing to show for an activity with no money", () => {
    expect(withRunningBalance([])).toEqual([]);
  });
});

describe("ledgerTotals", () => {
  it("splits the two sides and nets them", () => {
    const totals = ledgerTotals([
      row({ kind: "income", amount: 500 }),
      row({ kind: "income", amount: 250 }),
      row({ kind: "expense", amount: 300 }),
    ]);

    expect(totals).toEqual({ income: 750, expenses: 300, balance: 450 });
  });

  it("is all zeroes for an empty activity", () => {
    expect(ledgerTotals([])).toEqual({ income: 0, expenses: 0, balance: 0 });
  });
});
