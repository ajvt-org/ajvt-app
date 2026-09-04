import type { MoneyDestination } from "./moneyDestination";

export interface AllocationRow extends MoneyDestination {
  id: string;
  amount: number;
}

export interface AllocatedExpense extends MoneyDestination {
  id: string;
  amount: number;
  allocations: AllocationRow[];
}

export function allocationsOf(expense: AllocatedExpense): AllocationRow[] {
  if (expense.allocations.length > 0) return expense.allocations;
  return [
    {
      id: expense.id,
      amount: expense.amount,
      activityId: expense.activityId ?? null,
      competitionId: expense.activityId ? null : (expense.competitionId ?? null),
    },
  ];
}

export function allocationsFor(expense: AllocatedExpense, activityId: string): AllocationRow[] {
  return allocationsOf(expense).filter((row) => row.activityId === activityId);
}
