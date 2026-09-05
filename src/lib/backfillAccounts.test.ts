import { describe, it, expect } from "vitest";
import {
  METHOD_HAS_NO_ACCOUNT,
  NO_METHOD,
  attachableRows,
  soleAccountByMethod,
  totalOf,
  type AccountRow,
  type AttachableRow,
} from "./backfillAccounts";

function account(over: Partial<AccountRow> = {}): AccountRow {
  return { id: "a1", code: "111111", closedAt: null, ...over };
}

function row(over: Partial<AttachableRow> = {}): AttachableRow {
  return { id: "r1", method: ONLINE, amount: 0, ...over };
}

const ONLINE = "بنكيلي";
const CASH = "نقداً";

describe("which number a method's old rows belong to", () => {
  it("is the one number a method receives into", () => {
    const sole = soleAccountByMethod([{ name: ONLINE, accounts: [account()] }]);
    expect(sole.get(ONLINE)?.code).toBe("111111");
  });

  it("is nothing for a method that receives into none", () => {
    expect(soleAccountByMethod([{ name: CASH, accounts: [] }]).has(CASH)).toBe(false);
  });

  it("is nothing for a method with more than one number, since nobody can say which", () => {
    const sole = soleAccountByMethod([
      { name: ONLINE, accounts: [account(), account({ id: "a2", code: "222222" })] },
    ]);
    expect(sole.has(ONLINE)).toBe(false);
  });

  it("is nothing for a method whose second number has closed, since the old rows may be its", () => {
    const sole = soleAccountByMethod([
      { name: ONLINE, accounts: [account(), account({ id: "a2", closedAt: new Date() })] },
    ]);
    expect(sole.has(ONLINE)).toBe(false);
  });

  it("is the one number a method has even after it closed", () => {
    const sole = soleAccountByMethod([
      { name: ONLINE, accounts: [account({ closedAt: new Date() })] },
    ]);
    expect(sole.get(ONLINE)?.id).toBe("a1");
  });
});

describe("the rows a backfill may attach", () => {
  const sole = soleAccountByMethod([{ name: ONLINE, accounts: [account()] }]);

  it("groups the rows of a method under its number", () => {
    const { byAccount } = attachableRows([row(), row({ id: "r2" })], sole);
    expect(byAccount.get("a1")?.map((one) => one.id)).toEqual(["r1", "r2"]);
  });

  it("adds up what the rows going to a number are worth", () => {
    const { byAccount } = attachableRows(
      [row({ amount: 2000 }), row({ id: "r2", amount: 500 })],
      sole,
    );
    expect(totalOf(byAccount.get("a1") ?? [])).toBe(2500);
  });

  it("names the methods it could not match, and how many rows each holds", () => {
    const { unmatched } = attachableRows(
      [row({ method: CASH }), row({ id: "r2", method: CASH }), row({ id: "r3", method: "بنكيلى" })],
      sole,
    );
    expect(unmatched.get(CASH)).toBe(2);
    expect(unmatched.get("بنكيلى")).toBe(1);
  });

  it("does not name a row that gave no method at all", () => {
    const { unmatched } = attachableRows([row({ method: null })], sole);
    expect(unmatched.size).toBe(0);
  });

  it("leaves a row naming no method alone, and says why", () => {
    const { byAccount, skipped } = attachableRows([row({ method: null })], sole);
    expect(byAccount.size).toBe(0);
    expect(skipped.get(NO_METHOD)).toBe(1);
  });

  it("leaves a row alone when its method has no number, and says why", () => {
    const { skipped } = attachableRows([row({ method: CASH })], sole);
    expect(skipped.get(METHOD_HAS_NO_ACCOUNT)).toBe(1);
  });

  it("counts each reason separately", () => {
    const { skipped } = attachableRows(
      [row({ method: null }), row({ id: "r2", method: "   " }), row({ id: "r3", method: CASH })],
      sole,
    );
    expect(skipped.get(NO_METHOD)).toBe(2);
    expect(skipped.get(METHOD_HAS_NO_ACCOUNT)).toBe(1);
  });

  it("attaches nothing when there is nothing to attach", () => {
    const { byAccount, skipped } = attachableRows([], sole);
    expect(byAccount.size).toBe(0);
    expect(skipped.size).toBe(0);
  });
});
