import { prisma } from "./prisma";
import { allocationsFor } from "./expenseAllocationRows";
import { sharesTotal } from "./expenseSplit";

export const ALLOCATED_EXPENSE_SELECT = {
  id: true,
  amount: true,
  activityId: true,
  competitionId: true,
  allocations: {
    select: { id: true, amount: true, activityId: true, competitionId: true },
  },
} as const;

export function spentOnActivity(activityId: string) {
  return {
    OR: [{ allocations: { some: { activityId } } }, { allocations: { none: {} }, activityId }],
  };
}

export async function activitySpending(activityId: string): Promise<number> {
  const expenses = await prisma.expense.findMany({
    where: spentOnActivity(activityId),
    select: ALLOCATED_EXPENSE_SELECT,
  });
  return expenses.reduce(
    (total, expense) => total + sharesTotal(allocationsFor(expense, activityId)),
    0,
  );
}

export async function totalSpending(): Promise<number> {
  const spent = await prisma.expense.aggregate({ _sum: { amount: true } });
  return spent._sum.amount ?? 0;
}
