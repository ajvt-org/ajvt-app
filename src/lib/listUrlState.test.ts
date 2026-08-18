import { describe, it, expect } from "vitest";
import { readPage, pageCount, paginate } from "@/lib/listUrlState";

describe("reading the page out of the address", () => {
  it("falls back to the first page for anything that is not a later one", () => {
    for (const raw of ["", "0", "1", "-3", "abc", "2.5"]) {
      expect(readPage(new URLSearchParams(`page=${raw}`)), raw).toBe(1);
    }
  });

  it("takes a later page as given", () => {
    expect(readPage(new URLSearchParams("page=7"))).toBe(7);
  });
});

describe("how many pages a count needs", () => {
  it("is one when there is nothing, so the paging never disappears mid render", () => {
    expect(pageCount(0, 10)).toBe(1);
  });

  it("rounds a partial page up", () => {
    expect(pageCount(10, 10)).toBe(1);
    expect(pageCount(11, 10)).toBe(2);
    expect(pageCount(25, 10)).toBe(3);
  });
});

describe("slicing a page out of a list", () => {
  it("returns nothing for an empty list regardless of the page asked for", () => {
    expect(paginate([] as number[], 1, 10)).toEqual([]);
    expect(paginate([] as number[], 5, 10)).toEqual([]);
  });

  it("clamps a page past the end back onto the last real page", () => {
    const items = [1, 2, 3, 4, 5];
    expect(paginate(items, 99, 2)).toEqual(paginate(items, 3, 2));
    expect(paginate(items, 99, 2)).toEqual([5]);
  });

  it("slices the requested page in bounds", () => {
    const items = [1, 2, 3, 4, 5];
    expect(paginate(items, 1, 2)).toEqual([1, 2]);
    expect(paginate(items, 2, 2)).toEqual([3, 4]);
  });
});
