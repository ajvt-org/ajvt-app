import { describe, it, expect } from "vitest";
import {
  adminMethodRows,
  nextPosition,
  readName,
  swappedPositions,
  usageByName,
} from "./paymentMethodAdmin";
import { payableMethods, methodNames, type MethodWithAccounts } from "./paymentMethods";

function method(over: Partial<MethodWithAccounts> & { name: string }): MethodWithAccounts {
  return { id: over.name, memberFacing: true, active: true, position: 0, accounts: [], ...over };
}

const FIRST = method({ name: "first", position: 1 });
const SECOND = method({ name: "second", position: 2 });
const THIRD = method({ name: "third", position: 3 });

describe("how often a method is used", () => {
  it("adds up the same name across the records that hold it", () => {
    const totals = usageByName([
      { name: "first", count: 2 },
      { name: "first", count: 3 },
      { name: "second", count: 1 },
    ]);
    expect(totals.get("first")).toBe(5);
    expect(totals.get("second")).toBe(1);
  });

  it("ignores records holding no method at all", () => {
    const totals = usageByName([
      { name: null, count: 9 },
      { name: "   ", count: 4 },
    ]);
    expect(totals.size).toBe(0);
  });

  it("reports nothing rather than undefined for a method nobody used", () => {
    expect(adminMethodRows([FIRST], [])[0].used).toBe(0);
  });

  it("counts a method that has been deactivated, since old records still hold it", () => {
    const retired = method({ name: "retired", position: 4, active: false });
    const rows = adminMethodRows([FIRST, retired], [{ name: "retired", count: 7 }]);
    expect(rows.find((row) => row.name === "retired")?.used).toBe(7);
  });
});

describe("adding a method", () => {
  it("puts it after every method there is", () => {
    expect(nextPosition([FIRST, SECOND, THIRD])).toBe(4);
  });

  it("starts at one when there are none", () => {
    expect(nextPosition([])).toBe(1);
  });

  it("trims the name it is given", () => {
    expect(readName("  cash  ")).toBe("cash");
    expect(readName(7)).toBe("");
  });
});

describe("moving a method", () => {
  it("swaps it with the one above", () => {
    const pair = swappedPositions([FIRST, SECOND, THIRD], "second", "up");
    expect(pair?.map((m) => m.name)).toEqual(["second", "first"]);
  });

  it("swaps it with the one below", () => {
    const pair = swappedPositions([FIRST, SECOND, THIRD], "second", "down");
    expect(pair?.map((m) => m.name)).toEqual(["second", "third"]);
  });

  it("refuses to move the first one up or the last one down", () => {
    expect(swappedPositions([FIRST, SECOND], "first", "up")).toBeNull();
    expect(swappedPositions([FIRST, SECOND], "second", "down")).toBeNull();
  });

  it("refuses a method that is not there", () => {
    expect(swappedPositions([FIRST], "missing", "up")).toBeNull();
  });
});

describe("what a member may be offered", () => {
  const open = { id: "a1", code: "1", label: null, position: 1, active: true, closedAt: null };
  const receiving = (name: string, position: number) =>
    method({ name, position, accounts: [open] });

  it("is a method that is offered, member facing, and receiving money somewhere", () => {
    const methods = [receiving("first", 1), receiving("second", 2), THIRD];
    expect(methodNames(payableMethods(methods))).toEqual(["first", "second"]);
  });

  it("leaves out a method with nowhere to receive money", () => {
    expect(methodNames(payableMethods([THIRD]))).toEqual([]);
  });

  it("leaves out a method whose only account is closed at the bank", () => {
    const closed = method({ name: "first", accounts: [{ ...open, closedAt: new Date() }] });
    expect(methodNames(payableMethods([closed]))).toEqual([]);
  });

  it("leaves out a method whose only account an admin switched off", () => {
    const off = method({ name: "first", accounts: [{ ...open, active: false }] });
    expect(methodNames(payableMethods([off]))).toEqual([]);
  });

  it("leaves out a method an admin marked admin only", () => {
    const adminOnly = method({ name: "first", position: 1, memberFacing: false, accounts: [open] });
    expect(methodNames(payableMethods([adminOnly]))).toEqual([]);
  });

  it("leaves out a method an admin deactivated", () => {
    const stopped = method({ name: "first", position: 1, active: false, accounts: [open] });
    expect(methodNames(payableMethods([stopped]))).toEqual([]);
  });
});
