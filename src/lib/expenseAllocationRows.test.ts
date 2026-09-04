import { describe, it, expect } from "vitest";
import { allocationsFor, allocationsOf, type AllocatedExpense } from "./expenseAllocationRows";

function expense(over: Partial<AllocatedExpense> = {}): AllocatedExpense {
  return {
    id: "e1",
    amount: 900,
    activityId: null,
    competitionId: null,
    allocations: [],
    ...over,
  };
}

describe("the shares an expense is split into", () => {
  it("is what it was allocated when it has allocations", () => {
    const rows = allocationsOf(
      expense({
        allocations: [
          { id: "x1", amount: 400, activityId: "a1", competitionId: null },
          { id: "x2", amount: 500, activityId: "a2", competitionId: null },
        ],
      }),
    );
    expect(rows.map((r) => r.amount)).toEqual([400, 500]);
  });

  it("falls back to the whole amount on its own destination when it has none", () => {
    expect(allocationsOf(expense({ activityId: "a1" }))).toEqual([
      { id: "e1", amount: 900, activityId: "a1", competitionId: null },
    ]);
  });

  it("falls back to no destination when it has none of either", () => {
    expect(allocationsOf(expense())).toEqual([
      { id: "e1", amount: 900, activityId: null, competitionId: null },
    ]);
  });

  it("falls back to the competition when there is no activity", () => {
    expect(allocationsOf(expense({ competitionId: "c1" }))).toEqual([
      { id: "e1", amount: 900, activityId: null, competitionId: "c1" },
    ]);
  });

  it("keeps the activity when a row somehow holds both", () => {
    expect(allocationsOf(expense({ activityId: "a1", competitionId: "c1" }))).toEqual([
      { id: "e1", amount: 900, activityId: "a1", competitionId: null },
    ]);
  });

  it("never counts an expense twice by mixing the two", () => {
    const rows = allocationsOf(
      expense({
        activityId: "a1",
        allocations: [{ id: "x1", amount: 900, activityId: "a2", competitionId: null }],
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].activityId).toBe("a2");
  });
});

describe("the shares belonging to one activity", () => {
  it("takes only that activity's share of a split", () => {
    const rows = allocationsFor(
      expense({
        allocations: [
          { id: "x1", amount: 400, activityId: "a1", competitionId: null },
          { id: "x2", amount: 500, activityId: "a2", competitionId: null },
        ],
      }),
      "a1",
    );
    expect(rows).toEqual([{ id: "x1", amount: 400, activityId: "a1", competitionId: null }]);
  });

  it("takes both when one expense is split onto the same activity twice", () => {
    const rows = allocationsFor(
      expense({
        allocations: [
          { id: "x1", amount: 100, activityId: "a1", competitionId: null },
          { id: "x2", amount: 200, activityId: "a1", competitionId: null },
        ],
      }),
      "a1",
    );
    expect(rows.map((r) => r.amount)).toEqual([100, 200]);
  });

  it("takes an unallocated expense that names the activity itself", () => {
    expect(allocationsFor(expense({ activityId: "a1" }), "a1")).toHaveLength(1);
  });

  it("takes nothing when the activity is not among them", () => {
    expect(allocationsFor(expense({ activityId: "a2" }), "a1")).toEqual([]);
  });
});
