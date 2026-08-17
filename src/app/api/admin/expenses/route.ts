import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUnscopedAdmin } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { expenseCreateSchema } from "./schema";

export const GET = withRoute("GET /api/admin/expenses", async () => {
  await requireUnscopedAdmin();
  const expenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
    include: {
      tags: { select: { id: true, name: true } },
      activity: { select: { id: true, title: true } },
    },
  });
  return NextResponse.json({ expenses });
});

export const POST = withRoute("POST /api/admin/expenses", async (req: NextRequest) => {
  const session = await requireUnscopedAdmin();
  const { label, amount, note, date, proof, tagIds, activityId } = parse(
    expenseCreateSchema,
    await req.json(),
  );

  const n = Number(amount);
  const parsedDate = date === undefined || date === null ? new Date() : new Date(date as string);

  const expense = await prisma.expense.create({
    data: {
      label,
      amount: n,
      note: note?.trim() || null,
      proof: proof || null,
      date: parsedDate,
      createdBy: session.username,
      tags: tagIds?.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
      activityId: activityId || null,
    },
    include: {
      tags: { select: { id: true, name: true } },
      activity: { select: { id: true, title: true } },
    },
  });
  await logAction(
    session.username,
    "CREATE_EXPENSE",
    `${expense.label} — ${expense.amount} أوقية`,
    {
      ...auditContext(session, req),
      targetType: "Expense",
      targetId: expense.id,
      after: {
        label: expense.label,
        amount: expense.amount,
        note: expense.note,
        date: expense.date,
        proof: expense.proof,
      },
    },
  );

  return NextResponse.json({ expense }, { status: 201 });
});
