import { describe, it, expect } from "vitest";
import { NO_AMOUNT } from "@/lib/amountFilter";
import type { Expense } from "./types";
import {
  EXPENSES_FILTER_KEYS,
  NO_EXPENSES_FILTERS,
  TAG_CHIP,
  activeExpensesFilterCount,
  expensesAreFiltered,
  matchesExpensesFilters,
  readExpensesFilters,
  withoutExpensesChip,
  writeExpensesFilters,
} from "./expensesFilters";

const NONE = {
  q: "",
  tagIds: [] as string[],
  destinationId: "",
  dateFrom: "",
  dateTo: "",
  amount: NO_AMOUNT,
};

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
      amount: { op: "eq" as const, figure: "30000" },
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
    expect(EXPENSES_FILTER_KEYS).toEqual(["q", "tags", "destination", "from", "to", "amount"]);
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

  it("counts the amount as one filter, operator and figure together", () => {
    const amount = { op: "lt" as const, figure: "5000" };
    expect(activeExpensesFilterCount({ ...NO_EXPENSES_FILTERS, amount })).toBe(1);
    expect(expensesAreFiltered({ ...NO_EXPENSES_FILTERS, amount })).toBe(true);
  });

  it("does not count an operator with no figure", () => {
    const amount = { op: "eq" as const, figure: "" };
    expect(activeExpensesFilterCount({ ...NO_EXPENSES_FILTERS, amount })).toBe(0);
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
    amount: { op: "gt" as const, figure: "1000" },
  };

  it("clears the amount, operator and figure together", () => {
    expect(withoutExpensesChip(on, "amount").amount).toEqual(NO_AMOUNT);
  });

  it("drops the one tag it names and keeps the others", () => {
    expect(withoutExpensesChip(on, `${TAG_CHIP}a`).tagIds).toEqual(["b"]);
  });

  it("clears the destination and each date on its own", () => {
    expect(withoutExpensesChip(on, "destination").destinationId).toBe("");
    expect(withoutExpensesChip(on, "dateFrom").dateFrom).toBe("");
    expect(withoutExpensesChip(on, "dateTo").dateTo).toBe("");
  });

  it("keeps the search whichever chip goes", () => {
    for (const key of ["destination", "dateFrom", "dateTo", "amount", `${TAG_CHIP}a`]) {
      expect(withoutExpensesChip(on, key).q).toBe("essence");
    }
  });

  it("changes nothing for a key it does not own", () => {
    expect(withoutExpensesChip(on, "sort")).toEqual(on);
  });
});

describe("narrowing the list of expenses", () => {
  const expense = (over: Partial<Expense> = {}): Expense => ({
    id: "e1",
    label: "essence",
    amount: 1500,
    method: null,
    accountId: null,
    account: null,
    note: null,
    proofs: [],
    date: "2026-08-15T10:00:00.000Z",
    createdBy: "admin",
    tags: [{ id: "a", name: "transport" }],
    allocations: [
      { id: "s1", amount: 1500, activity: { id: "act-1", title: "t" }, competition: null },
    ],
    ...over,
  });
  const on = (over: Partial<typeof NO_EXPENSES_FILTERS> = {}) => ({
    ...NO_EXPENSES_FILTERS,
    ...over,
  });

  it("keeps every expense when nothing is chosen", () => {
    expect(matchesExpensesFilters(expense(), NO_EXPENSES_FILTERS)).toBe(true);
  });

  it("keeps an expense carrying any of the tags chosen", () => {
    expect(matchesExpensesFilters(expense(), on({ tagIds: ["b", "a"] }))).toBe(true);
    expect(matchesExpensesFilters(expense(), on({ tagIds: ["b"] }))).toBe(false);
  });

  it("searches the label and the amount", () => {
    expect(matchesExpensesFilters(expense(), on({ q: "ess" }))).toBe(true);
    expect(matchesExpensesFilters(expense(), on({ q: "150" }))).toBe(true);
    expect(matchesExpensesFilters(expense(), on({ q: "loyer" }))).toBe(false);
  });

  it("matches the destination through an activity or a competition share", () => {
    const toCompetition = expense({
      allocations: [
        { id: "s1", amount: 1500, activity: null, competition: { id: "c-1", name: "c" } },
      ],
    });
    expect(matchesExpensesFilters(expense(), on({ destinationId: "act-1" }))).toBe(true);
    expect(matchesExpensesFilters(toCompetition, on({ destinationId: "c-1" }))).toBe(true);
    expect(matchesExpensesFilters(expense(), on({ destinationId: "c-1" }))).toBe(false);
  });

  it("keeps an expense over, under or equal to the figure typed", () => {
    expect(matchesExpensesFilters(expense(), on({ amount: { op: "gt", figure: "1499" } }))).toBe(
      true,
    );
    expect(matchesExpensesFilters(expense(), on({ amount: { op: "lt", figure: "1500" } }))).toBe(
      false,
    );
    expect(matchesExpensesFilters(expense(), on({ amount: { op: "eq", figure: "1500" } }))).toBe(
      true,
    );
  });

  it("carries the amount as one parameter", () => {
    const amount = { op: "lt" as const, figure: "5000" };
    expect(writeExpensesFilters({ ...NO_EXPENSES_FILTERS, amount }).get("amount")).toBe("lt:5000");
  });

  it("keeps the first and the last day of the range", () => {
    expect(matchesExpensesFilters(expense(), on({ dateFrom: "2026-08-15" }))).toBe(true);
    expect(matchesExpensesFilters(expense(), on({ dateTo: "2026-08-15" }))).toBe(true);
    expect(matchesExpensesFilters(expense(), on({ dateFrom: "2026-08-16" }))).toBe(false);
    expect(matchesExpensesFilters(expense(), on({ dateTo: "2026-08-14" }))).toBe(false);
  });
});
