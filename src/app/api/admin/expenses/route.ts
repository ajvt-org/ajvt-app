import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { MONEY_AREAS } from "@/lib/adminNav";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { offeredMethodNames } from "@/lib/paymentMethodsServer";
import { expenseCreateSchema } from "./schema";
import { money } from "@/lib/money";
import { leadProof } from "@/lib/expenseProofs";
import { createExpense, listExpenses } from "@/lib/expensesServer";

export const GET = withRoute("GET /api/admin/expenses", async () => {
  await requireArea(MONEY_AREAS.expenses);

  return NextResponse.json({ expenses: await listExpenses() });
});

export const POST = withRoute("POST /api/admin/expenses", async (req: NextRequest) => {
  const session = await requireArea(MONEY_AREAS.expenses);
  const input = parse(expenseCreateSchema(await offeredMethodNames()), await req.json());

  const { expense, files } = await createExpense(input, session.username);

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
        proof: leadProof(files),
      },
    },
  );

  return NextResponse.json({ expense }, { status: 201 });
});
