import { describe, it, expect } from "vitest";
import { EXPENSES_FILTER_KEYS, readExpensesFilters, writeExpensesFilters } from "./expensesFilters";

const NONE = { q: "", tagIds: [] as string[], activityId: "", dateFrom: "", dateTo: "" };

describe("carrying the expenses filters in the address", () => {
  it("reads an empty query as no filter at all", () => {
    expect(readExpensesFilters(new URLSearchParams())).toEqual(NONE);
  });

  it("writes nothing for the default view", () => {
    expect(writeExpensesFilters(NONE).toString()).toBe("");
  });

  it("survives a round trip, which is what a shared link is", () => {
    const chosen = {
      q: "essence",
      tagIds: ["tag-a", "tag-b"],
      activityId: "act-1",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
    };
    expect(
      readExpensesFilters(new URLSearchParams(writeExpensesFilters(chosen).toString())),
    ).toEqual(chosen);
  });

  it("treats an empty tags param as no tags rather than one blank tag", () => {
    expect(readExpensesFilters(new URLSearchParams("tags=")).tagIds).toEqual([]);
  });

  it("reads a single tag the same as several", () => {
    expect(readExpensesFilters(new URLSearchParams("tags=tag-a")).tagIds).toEqual(["tag-a"]);
  });

  it("lists exactly the keys it owns in the address", () => {
    expect(EXPENSES_FILTER_KEYS).toEqual(["q", "tags", "activity", "from", "to"]);
  });
});
