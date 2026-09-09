import { describe, it, expect } from "vitest";
import {
  EXPENSES_FILTER_KEYS,
  NO_EXPENSES_FILTERS,
  TAG_CHIP,
  activeExpensesFilterCount,
  expensesAreFiltered,
  readExpensesFilters,
  withoutExpensesChip,
  writeExpensesFilters,
} from "./expensesFilters";

const NONE = { q: "", tagIds: [] as string[], destinationId: "", dateFrom: "", dateTo: "" };

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
      destinationId: "act-1",
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
    expect(EXPENSES_FILTER_KEYS).toEqual(["q", "tags", "destination", "from", "to"]);
  });
});

describe("what the filter button and the chips row say is on", () => {
  it("counts nothing on the default view", () => {
    expect(activeExpensesFilterCount(NO_EXPENSES_FILTERS)).toBe(0);
    expect(expensesAreFiltered(NO_EXPENSES_FILTERS)).toBe(false);
  });

  it("counts each tag on its own beside the destination and the two dates", () => {
    const on = {
      ...NO_EXPENSES_FILTERS,
      tagIds: ["a", "b"],
      destinationId: "act-1",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
    };
    expect(activeExpensesFilterCount(on)).toBe(5);
  });

  it("leaves the search out of the count and still calls the list filtered", () => {
    const searching = { ...NO_EXPENSES_FILTERS, q: "essence" };
    expect(activeExpensesFilterCount(searching)).toBe(0);
    expect(expensesAreFiltered(searching)).toBe(true);
  });

  it("treats a search of spaces as no search", () => {
    expect(expensesAreFiltered({ ...NO_EXPENSES_FILTERS, q: "   " })).toBe(false);
  });
});

describe("removing one chip", () => {
  const on = {
    q: "essence",
    tagIds: ["a", "b"],
    destinationId: "act-1",
    dateFrom: "2026-08-01",
    dateTo: "2026-08-31",
  };

  it("drops the one tag it names and keeps the others", () => {
    expect(withoutExpensesChip(on, `${TAG_CHIP}a`).tagIds).toEqual(["b"]);
  });

  it("clears the destination and each date on its own", () => {
    expect(withoutExpensesChip(on, "destination").destinationId).toBe("");
    expect(withoutExpensesChip(on, "dateFrom").dateFrom).toBe("");
    expect(withoutExpensesChip(on, "dateTo").dateTo).toBe("");
  });

  it("keeps the search whichever chip goes", () => {
    for (const key of ["destination", "dateFrom", "dateTo", `${TAG_CHIP}a`]) {
      expect(withoutExpensesChip(on, key).q).toBe("essence");
    }
  });

  it("changes nothing for a key it does not own", () => {
    expect(withoutExpensesChip(on, "sort")).toEqual(on);
  });
});
