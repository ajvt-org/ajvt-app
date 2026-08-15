import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { expenseCreateSchema } from "./schema";

export const GET = withRoute("GET /api/admin/expenses", async () => {
  await requireAdmin();
  const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json({ expenses });
});

export const POST = withRoute("POST /api/admin/expenses", async (req: NextRequest) => {
  const session = await requireAdmin();
  const { label, amount, note, date, proof } = parse(expenseCreateSchema, await req.json());

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
