import { describe, it, expect } from "vitest";
import { supportersPage, supportersSummary } from "./supportersBoard";

const PAGE_SIZE = 20;

function page(query: string) {
  return supportersPage(new URLSearchParams(query), PAGE_SIZE);
}

describe("the supporters summary", () => {
  it("counts the supporters and adds up what they gave", () => {
    expect(supportersSummary([{ total: 500 }, { total: 300 }, { total: 200 }])).toEqual({
      count: 3,
      given: 1000,
    });
  });

  it("answers zero on an empty board", () => {
    expect(supportersSummary([])).toEqual({ count: 0, given: 0 });
  });

  it("counts a supporter who gave nothing", () => {
    expect(supportersSummary([{ total: 0 }])).toEqual({ count: 1, given: 0 });
  });
});

describe("the supporters page", () => {
  it("starts at the top with a full page when nothing is asked", () => {
    expect(page("")).toEqual({ offset: 0, limit: PAGE_SIZE });
  });

  it("reads the offset that was asked for", () => {
    expect(page("offset=40")).toEqual({ offset: 40, limit: PAGE_SIZE });
  });

  it("refuses to walk backwards past the top", () => {
    expect(page("offset=-10").offset).toBe(0);
  });

  it("ignores an offset that is not a number", () => {
    expect(page("offset=third").offset).toBe(0);
  });

  it("gives a smaller page when a smaller one is asked for", () => {
    expect(page("limit=5").limit).toBe(5);
  });

  it("never gives more than one page however large the ask", () => {
    expect(page("limit=500").limit).toBe(PAGE_SIZE);
  });

  it("gives a full page when the ask is zero or nonsense", () => {
    expect(page("limit=0").limit).toBe(PAGE_SIZE);
    expect(page("limit=none").limit).toBe(PAGE_SIZE);
  });
});
