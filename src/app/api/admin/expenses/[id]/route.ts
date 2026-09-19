import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { MONEY_AREAS } from "@/lib/adminNav";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { offeredMethodNames } from "@/lib/paymentMethodsServer";
import { acceptedNames } from "@/lib/paymentMethods";
import { expenseUpdateSchema } from "../schema";
import { money } from "@/lib/money";
import { leadProof } from "@/lib/expenseProofs";
import { expenseOrNotFound, removeExpense } from "@/lib/expensesServer";
import { updateExpense } from "@/lib/expenseUpdateServer";

export const PATCH = withRoute(
  "PATCH /api/admin/expenses/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireArea(MONEY_AREAS.expenses);
    const { id } = await params;

    const existing = await expenseOrNotFound(id);
    const accepted = acceptedNames(await offeredMethodNames(), existing.method);
    const edit = parse(expenseUpdateSchema(accepted), await req.json());

    const { expense, wanted } = await updateExpense(id, existing, edit);

    await logAction(
      session.username,
      "UPDATE_EXPENSE",
      `${expense.label} — ${money(expense.amount)}`,
      {
        ...auditContext(session, req),
        targetType: "Expense",
        targetId: expense.id,
        before: existing,
        after: {
          label: expense.label,
          amount: expense.amount,
          method: expense.method,
          note: expense.note,
          date: expense.date,
          proof: leadProof(wanted),
        },
      },
    );

    return NextResponse.json({ expense });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/expenses/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireArea(MONEY_AREAS.expenses);
    const { id } = await params;

    const existing = await removeExpense(id);

    await logAction(
      session.username,
      "DELETE_EXPENSE",
      `${existing.label} — ${money(existing.amount)}`,
      {
        ...auditContext(session, req),
        targetType: "Expense",
        targetId: id,
        before: existing,
      },
    );

    return NextResponse.json({ ok: true });
  },
);
