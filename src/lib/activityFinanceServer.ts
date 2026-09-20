import { prisma } from "./prisma";
import { NotFoundError } from "./errors";
import { activities } from "./messages";
import { ledgerTotals, type LedgerInput } from "./activityLedger";
import { allocationsFor } from "./expenseAllocationRows";
import { spentOnActivity } from "./expenseSpendingServer";
import { DONOR_ACCOUNT_SELECT, donorNameOnRecord } from "./donorName";
import type { SupportViewer } from "./supportPrivacy";

function day(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function activityLedger(id: string, viewer: SupportViewer) {
  const activity = await prisma.activity.findUnique({ where: { id }, select: { id: true } });
  if (!activity) throw new NotFoundError(activities.notFound);

  const [donations, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { activityId: id, status: "ACTIVE", purpose: { in: ["DONATION", "ACTIVITY"] } },
      select: {
        id: true,
        donorName: true,
        amount: true,
        createdAt: true,
        userId: true,
        user: { select: DONOR_ACCOUNT_SELECT },
      },
    }),
    prisma.expense.findMany({
      where: spentOnActivity(id),
      select: {
        id: true,
        label: true,
        amount: true,
        date: true,
        allocations: {
          select: { id: true, amount: true, activityId: true, competitionId: true },
        },
      },
    }),
  ]);

  const rows: LedgerInput[] = [
    ...donations.map((donation) => ({
      id: donation.id,
      kind: "income" as const,
      label: donorNameOnRecord(donation, viewer),
      amount: donation.amount,
      date: day(donation.createdAt),
    })),
    ...expenses.flatMap((expense) =>
      allocationsFor(expense, id).map((share) => ({
        id: share.id,
        kind: "expense" as const,
        label: expense.label,
        amount: share.amount,
        date: day(expense.date),
      })),
    ),
  ];

  return { rows, totals: ledgerTotals(rows) };
}
