import { prisma } from "./prisma";
import { splitPayment } from "./membershipPayment";
import { byMonth, byTag, sumOf, type ReportEntry } from "./financeReport";

export async function financeReport(from: Date, to: Date) {
  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "ACTIVE", createdAt: { gte: from, lte: to } },
      select: {
        amount: true,
        purpose: true,
        feeApplied: true,
        createdAt: true,
        tags: { select: { name: true } },
      },
    }),
    prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
      select: { amount: true, date: true, tags: { select: { name: true } } },
    }),
  ]);

  const income: ReportEntry[] = payments.map((p) => ({
    at: p.createdAt,
    amount: p.amount,
    tags: p.tags.map((t) => t.name),
  }));
  const spending: ReportEntry[] = expenses.map((e) => ({
    at: e.date,
    amount: e.amount,
    tags: e.tags.map((t) => t.name),
  }));

  const fees = payments
    .filter((p) => p.purpose === "MEMBERSHIP")
    .reduce((total, p) => total + splitPayment(p.amount, p.feeApplied ?? 0).fee, 0);

  const totalIncome = sumOf(income);
  const totalSpending = sumOf(spending);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    months: byMonth(income, spending, from, to),
    incomeByTag: byTag(income),
    spendingByTag: byTag(spending),
    totals: {
      income: totalIncome,
      spending: totalSpending,
      net: totalIncome - totalSpending,
      membershipFees: fees,
      support: totalIncome - fees,
    },
  };
}
