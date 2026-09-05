import { describe, it, expect } from "vitest";
import { expenseBodyOf } from "./expenseBody";
import { emptyExpenseForm, type ExpenseForm } from "./types";
import type { DestinationOption } from "@/lib/moneyDestination";

const DESTINATIONS: DestinationOption[] = [
  { id: "a1", kind: "activity", title: "نشاط" },
  { id: "c1", kind: "competition", title: "مسابقة" },
];

function formOf(over: Partial<ExpenseForm>): ExpenseForm {
  return { ...emptyExpenseForm, label: "كرات", amount: "500", ...over };
}

describe("expenseBodyOf", () => {
  it("sends the number the expense was paid from", () => {
    const body = expenseBodyOf(formOf({ method: "بنكيلي", accountId: "acc1" }), DESTINATIONS);
    expect(body.accountId).toBe("acc1");
  });

  it("sends no number when none was picked", () => {
    const body = expenseBodyOf(formOf({ method: "بنكيلي" }), DESTINATIONS);
    expect(body.accountId).toBeNull();
  });

  it("clears the number when the method is cleared", () => {
    const body = expenseBodyOf(formOf({ method: "", accountId: "" }), DESTINATIONS);
    expect(body.accountId).toBeNull();
    expect(body.method).toBeNull();
  });

  it("keeps one destination when a single share is chosen", () => {
    const body = expenseBodyOf(
      formOf({ allocations: [{ destinationId: "a1", amount: "500" }] }),
      DESTINATIONS,
    );
    expect(body).toMatchObject({ activityId: "a1", competitionId: null });
  });

  it("splits into allocations when several shares are chosen", () => {
    const body = expenseBodyOf(
      formOf({
        allocations: [
          { destinationId: "a1", amount: "300" },
          { destinationId: "c1", amount: "200" },
        ],
      }),
      DESTINATIONS,
    );
    expect(body).toMatchObject({
      allocations: [
        { activityId: "a1", competitionId: null, amount: 300 },
        { activityId: null, competitionId: "c1", amount: 200 },
      ],
    });
  });
});
