import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/auth";
import { MONEY_AREAS } from "@/lib/adminNav";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { expenseUpdateSchema } from "../schema";
import { money } from "@/lib/money";

export const PATCH = withRoute(
  "PATCH /api/admin/expenses/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireArea(MONEY_AREAS.expenses);
    const { id } = await params;
    const { label, amount, method, note, date, proof, tagIds, activityId } = parse(
      expenseUpdateSchema,
      await req.json(),
    );

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "المصروف غير موجود" }, { status: 404 });
    }

    const data: {
      label?: string;
      amount?: number;
      method?: string | null;
      note?: string | null;
      date?: Date;
      proof?: string | null;
      tags?: { set: { id: string }[] };
      activityId?: string | null;
    } = {};

    if (label !== undefined) data.label = label;
    if (amount !== undefined) data.amount = Number(amount);
    if (method !== undefined) data.method = method?.trim() || null;

    if (note !== undefined) {
      data.note = note?.trim() || null;
    }

    if (date !== undefined) data.date = new Date(date as string);
    if (proof !== undefined) data.proof = proof;
    if (tagIds !== undefined) data.tags = { set: tagIds.map((id) => ({ id })) };
    if (activityId !== undefined) data.activityId = activityId || null;

    const expense = await prisma.expense.update({
      where: { id },
      data,
      include: {
        tags: { select: { id: true, name: true } },
        activity: { select: { id: true, title: true } },
      },
    });
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
          proof: expense.proof,
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

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "المصروف غير موجود" }, { status: 404 });
    }

    await prisma.expense.delete({ where: { id } });
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
