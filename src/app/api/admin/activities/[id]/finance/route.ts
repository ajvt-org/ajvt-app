import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActivityFinanceAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { NotFoundError } from "@/lib/errors";
import { ledgerTotals, type LedgerInput } from "@/lib/activityLedger";
import { allocationsFor } from "@/lib/expenseAllocationRows";
import { activities } from "@/lib/messages";
import { DONOR_ACCOUNT_SELECT, donorNameOnRecord } from "@/lib/donorName";
import { viewerOf } from "@/lib/supportViewer";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/finance",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityFinanceAccess(id);

    const activity = await prisma.activity.findUnique({ where: { id }, select: { id: true } });
    if (!activity) throw new NotFoundError(activities.notFound);

    const [donations, expenses] = await Promise.all([
      prisma.donation.findMany({
        where: { activityId: id, status: "ACTIVE" },
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
        where: {
          OR: [
            { allocations: { some: { activityId: id } } },
            { allocations: { none: {} }, activityId: id },
          ],
        },
        select: {
          id: true,
          label: true,
          amount: true,
          date: true,
          activityId: true,
          competitionId: true,
          allocations: {
            select: { id: true, amount: true, activityId: true, competitionId: true },
          },
        },
      }),
    ]);

    const rows: LedgerInput[] = [
      ...donations.map((d) => ({
        id: d.id,
        kind: "income" as const,
        label: donorNameOnRecord(d, viewerOf(session)),
        amount: d.amount ?? 0,
        date: d.createdAt.toISOString().slice(0, 10),
      })),
      ...expenses.flatMap((expense) =>
        allocationsFor(expense, id).map((share) => ({
          id: share.id,
          kind: "expense" as const,
          label: expense.label,
          amount: share.amount,
          date: expense.date.toISOString().slice(0, 10),
        })),
      ),
    ];

    return NextResponse.json({ rows, totals: ledgerTotals(rows) });
  },
);
