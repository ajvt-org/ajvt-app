import { describe, it, expect } from "vitest";
import { containsSearch, normalizeSearch } from "./searchText";

describe("reading what somebody typed into a search box", () => {
  it("reads a hamza written plainly as the same letter", () => {
    expect(normalizeSearch("احمد")).toBe(normalizeSearch("أحمد"));
    expect(normalizeSearch("اسماء")).toBe(normalizeSearch("إسماء"));
    expect(normalizeSearch("الان")).toBe(normalizeSearch("الآن"));
  });

  it("reads the two forms of the last letter as one", () => {
    expect(normalizeSearch("يحي")).toBe(normalizeSearch("يحى"));
    expect(normalizeSearch("فاطمه")).toBe(normalizeSearch("فاطمة"));
  });

  it("ignores the marks above and below the letters", () => {
    expect(normalizeSearch("أَحْمَد")).toBe(normalizeSearch("احمد"));
  });

  it("ignores the stretch a keyboard adds between letters", () => {
    expect(normalizeSearch("محـــمد")).toBe(normalizeSearch("محمد"));
  });

  it("reads Arabic digits as the digits a receipt is printed in", () => {
    expect(normalizeSearch("٢٠٢٦")).toBe("2026");
  });

  it("ignores the case of a reference typed the other way", () => {
    expect(normalizeSearch("r-2026-0167")).toBe(normalizeSearch("R-2026-0167"));
  });

  it("drops the space around what was typed", () => {
    expect(normalizeSearch("  احمد  ")).toBe("احمد");
  });
});

describe("matching a row against what was typed", () => {
  const needle = normalizeSearch("أحمد");

  it("finds a name however either side spells the hamza", () => {
    expect(containsSearch("احمد ولد محمد", needle)).toBe(true);
    expect(containsSearch("أحمد ولد محمد", needle)).toBe(true);
  });

  it("finds nothing in a row that holds nothing", () => {
    expect(containsSearch(null, needle)).toBe(false);
    expect(containsSearch("", needle)).toBe(false);
  });

  it("finds a receipt by its number with the prefix or without it", () => {
    expect(containsSearch("R-2026-0167", normalizeSearch("R-2026-0167"))).toBe(true);
    expect(containsSearch("R-2026-0167", normalizeSearch("2026-0167"))).toBe(true);
    expect(containsSearch("R-2026-0167", normalizeSearch("0167"))).toBe(true);
    expect(containsSearch("R-2026-0167", normalizeSearch("r-2026-0167"))).toBe(true);
  });

  it("does not find a receipt whose number is somebody else's", () => {
    expect(containsSearch("R-2026-0167", normalizeSearch("0168"))).toBe(false);
  });
});
