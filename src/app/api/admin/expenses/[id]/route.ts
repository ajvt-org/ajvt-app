import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { expenseUpdateSchema } from "../schema";

export const PATCH = withRoute(
  "PATCH /api/admin/expenses/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdmin();
    const { id } = await params;
    const { label, amount, note, date, proof, tagIds } = parse(
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
      note?: string | null;
      date?: Date;
      proof?: string | null;
      tags?: { set: { id: string }[] };
    } = {};

    if (label !== undefined) data.label = label;
    if (amount !== undefined) data.amount = Number(amount);

    if (note !== undefined) {
      data.note = note?.trim() || null;
    }

    if (date !== undefined) data.date = new Date(date as string);
    if (proof !== undefined) data.proof = proof;
    // set, not connect: the list sent is the whole list, so dropping a tag
    // in the form has to drop it here.
    if (tagIds !== undefined) data.tags = { set: tagIds.map((id) => ({ id })) };

    const expense = await prisma.expense.update({
      where: { id },
      data,
      include: { tags: { select: { id: true, name: true } } },
    });
    await logAction(
      session.username,
      "UPDATE_EXPENSE",
      `${expense.label} — ${expense.amount} أوقية`,
      {
        ...auditContext(session, req),
        targetType: "Expense",
        targetId: expense.id,
        before: existing,
        after: {
          label: expense.label,
          amount: expense.amount,
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
    const session = await requireAdmin();
    const { id } = await params;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "المصروف غير موجود" }, { status: 404 });
    }

    await prisma.expense.delete({ where: { id } });
    await logAction(
      session.username,
      "DELETE_EXPENSE",
      `${existing.label} — ${existing.amount} أوقية`,
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
