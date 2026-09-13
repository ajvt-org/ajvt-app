import { describe, it, expect } from "vitest";
import { allocationsFor, allocationsOf, type AllocatedExpense } from "./expenseAllocationRows";

function expense(over: Partial<AllocatedExpense> = {}): AllocatedExpense {
  return {
    id: "e1",
    amount: 900,
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

  it("takes nothing when the activity is not among them", () => {
    const rows = allocationsFor(
      expense({
        allocations: [{ id: "x1", amount: 900, activityId: "a2", competitionId: null }],
      }),
      "a1",
    );
    expect(rows).toEqual([]);
  });
});
