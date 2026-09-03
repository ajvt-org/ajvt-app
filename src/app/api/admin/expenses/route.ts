import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/auth";
import { MONEY_AREAS } from "@/lib/adminNav";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { offeredMethodNames } from "@/lib/paymentMethodsServer";
import { expenseCreateSchema } from "./schema";
import { money } from "@/lib/money";
import { resolveMoneyDestination } from "@/lib/moneyDestinationServer";
import { EXPENSE_DESTINATION_SELECT } from "@/lib/moneyDestination";

export const GET = withRoute("GET /api/admin/expenses", async () => {
  await requireArea(MONEY_AREAS.expenses);
  const expenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
    include: EXPENSE_DESTINATION_SELECT,
  });
  return NextResponse.json({ expenses });
});

export const POST = withRoute("POST /api/admin/expenses", async (req: NextRequest) => {
  const session = await requireArea(MONEY_AREAS.expenses);
  const { label, amount, method, note, date, proof, tagIds, activityId, competitionId } = parse(
    expenseCreateSchema(await offeredMethodNames()),
    await req.json(),
  );
  const destination = await resolveMoneyDestination({ activityId, competitionId });

  const n = Number(amount);
  const parsedDate = date === undefined || date === null ? new Date() : new Date(date as string);

  const expense = await prisma.expense.create({
    data: {
      label,
      amount: n,
      method: method?.trim() || null,
      note: note?.trim() || null,
      proof: proof || null,
      date: parsedDate,
      createdBy: session.username,
      tags: tagIds?.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
      activityId: destination.activityId,
      competitionId: destination.competitionId,
    },
    include: EXPENSE_DESTINATION_SELECT,
  });
  await logAction(
    session.username,
    "CREATE_EXPENSE",
    `${expense.label} — ${money(expense.amount)}`,
    {
      ...auditContext(session, req),
      targetType: "Expense",
      targetId: expense.id,
      after: {
        label: expense.label,
        amount: expense.amount,
        method: expense.method,
        note: expense.note,
        date: expense.date,
        proof: expense.proof,
      },
    },
  );

  return NextResponse.json({ expense }, { status: 201 });
});
