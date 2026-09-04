import { prisma } from "./prisma";
import { allocationsOf } from "./expenseAllocationRows";
import { activityReport as texts } from "./texts/activityReport";
import {
  activityReportRows,
  activityReportTotals,
  type ActivityReportRow,
  type ActivityReportTotals,
} from "./activityReport";

export interface ActivityReport {
  from: string;
  to: string;
  rows: ActivityReportRow[];
  totals: ActivityReportTotals;
}

export async function activityFinanceReport(from: Date, to: Date): Promise<ActivityReport> {
  const [activities, competitions, payments, expenses] = await Promise.all([
    prisma.activity.findMany({ select: { id: true, title: true } }),
    prisma.competition.findMany({ select: { id: true, name: true } }),
    prisma.payment.findMany({
      where: { status: "ACTIVE", createdAt: { gte: from, lte: to } },
      select: {
        amount: true,
        createdAt: true,
        activityId: true,
        competitionId: true,
        tags: { select: { name: true } },
        receipt: { select: { number: true, status: true } },
      },
    }),
    prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
      select: {
        id: true,
        amount: true,
        date: true,
        activityId: true,
        competitionId: true,
        tags: { select: { name: true } },
        allocations: {
          select: { id: true, amount: true, activityId: true, competitionId: true },
        },
      },
    }),
  ]);

  const rows = activityReportRows(
    activities,
    competitions,
    payments.map((p) => ({
      at: p.createdAt,
      amount: p.amount,
      activityId: p.activityId,
      competitionId: p.competitionId,
      tags: p.tags.map((t) => t.name),
      receiptNumber: p.receipt?.status === "ACTIVE" ? p.receipt.number : null,
    })),
    expenses.flatMap((expense) =>
      allocationsOf(expense).map((share) => ({
        at: expense.date,
        amount: share.amount,
        activityId: share.activityId,
        competitionId: share.competitionId,
        tags: expense.tags.map((t) => t.name),
      })),
    ),
    texts.general,
  );

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    rows,
    totals: activityReportTotals(rows),
  };
}
