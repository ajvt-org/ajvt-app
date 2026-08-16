import { describe, it, expect } from "vitest";
import { allSelected, toggleAll } from "./selection";

describe("selecting every row on the page", () => {
  it("is not 'all' when nothing is shown", () => {
    expect(allSelected([], new Set())).toBe(false);
    expect(allSelected([], new Set(["a"]))).toBe(false);
  });

  it("is 'all' only once every visible row is ticked", () => {
    expect(allSelected(["a", "b"], new Set(["a"]))).toBe(false);
    expect(allSelected(["a", "b"], new Set(["a", "b"]))).toBe(true);
  });

  it("ticks the whole page", () => {
    expect(toggleAll(["a", "b"], new Set())).toEqual(new Set(["a", "b"]));
  });

  it("unticks the whole page once it is all ticked", () => {
    expect(toggleAll(["a", "b"], new Set(["a", "b"]))).toEqual(new Set());
  });

  it("completes a part-ticked page rather than clearing it", () => {
    expect(toggleAll(["a", "b"], new Set(["a"]))).toEqual(new Set(["a", "b"]));
  });

  // Paging away and back must not lose what was already picked, and ticking
  // "all" on page two must not silently reach page one.
  it("leaves a selection made on another page alone", () => {
    expect(toggleAll(["c", "d"], new Set(["a"]))).toEqual(new Set(["a", "c", "d"]));
    expect(toggleAll(["c", "d"], new Set(["a", "c", "d"]))).toEqual(new Set(["a"]));
  });

  it("does not mutate the set it was given", () => {
    const selected = new Set(["a"]);
    toggleAll(["b"], selected);
    expect(selected).toEqual(new Set(["a"]));
  });
});
