import type { MoneyDestination } from "./moneyDestination";

export interface AllocationRow extends MoneyDestination {
  id: string;
  amount: number;
}

export interface AllocatedExpense {
  id: string;
  amount: number;
  allocations: AllocationRow[];
}

export function allocationsOf(expense: AllocatedExpense): AllocationRow[] {
  return expense.allocations;
}

export function allocationsFor(expense: AllocatedExpense, activityId: string): AllocationRow[] {
  return allocationsOf(expense).filter((row) => row.activityId === activityId);
}
