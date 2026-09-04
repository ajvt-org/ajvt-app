import { describe, it, expect } from "vitest";
import { evenSplit, sharesMatchTotal, sharesTotal } from "./expenseSplit";

describe("splitting an amount evenly", () => {
  it("divides a total that goes exactly", () => {
    expect(evenSplit(900, 3)).toEqual([300, 300, 300]);
  });

  it("gives the remainder to the earliest destinations, one unit each", () => {
    expect(evenSplit(1000, 3)).toEqual([334, 333, 333]);
  });

  it("hands out a remainder of two across the first two", () => {
    expect(evenSplit(1001, 3)).toEqual([334, 334, 333]);
  });

  it("always adds back up to the total", () => {
    for (const total of [1, 2, 7, 99, 1000, 12345, 40001]) {
      for (const count of [1, 2, 3, 4, 5, 7]) {
        expect(sharesTotal(evenSplit(total, count).map((amount) => ({ amount })))).toBe(total);
      }
    }
  });

  it("gives the whole amount to a single destination", () => {
    expect(evenSplit(777, 1)).toEqual([777]);
  });

  it("copes with a total smaller than the number of destinations", () => {
    expect(evenSplit(2, 3)).toEqual([1, 1, 0]);
  });

  it("splits nothing into nothing", () => {
    expect(evenSplit(0, 3)).toEqual([0, 0, 0]);
    expect(evenSplit(100, 0)).toEqual([]);
  });
});

describe("checking the shares against the total", () => {
  it("accepts shares that add up", () => {
    expect(sharesMatchTotal([{ amount: 300 }, { amount: 700 }], 1000)).toBe(true);
  });

  it("refuses shares that fall short", () => {
    expect(sharesMatchTotal([{ amount: 300 }, { amount: 600 }], 1000)).toBe(false);
  });

  it("refuses shares that overshoot by a single unit", () => {
    expect(sharesMatchTotal([{ amount: 300 }, { amount: 701 }], 1000)).toBe(false);
  });

  it("refuses an empty list against a real amount", () => {
    expect(sharesMatchTotal([], 1000)).toBe(false);
  });
});
