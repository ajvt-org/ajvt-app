import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/auth";
import { MONEY_AREAS } from "@/lib/adminNav";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { offeredMethodNames } from "@/lib/paymentMethodsServer";
import { acceptedNames } from "@/lib/paymentMethods";
import { expenseUpdateSchema } from "../schema";
import { money } from "@/lib/money";
import { expenses as expenseMessages } from "@/lib/messages";
import { legacyDestination, sharesForUpdate } from "@/lib/expenseSharesServer";
import { EXPENSE_DESTINATION_SELECT } from "@/lib/moneyDestination";
import { cleanProofNames, leadProof, proofsToAdd, proofsToRemove } from "@/lib/expenseProofs";
import { EXPENSE_ALLOCATION_SELECT, EXPENSE_PROOF_SELECT } from "@/lib/expenseProofsServer";

export const PATCH = withRoute(
  "PATCH /api/admin/expenses/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireArea(MONEY_AREAS.expenses);
    const { id } = await params;
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: expenseMessages.notFound }, { status: 404 });
    }

    const accepted = acceptedNames(await offeredMethodNames(), existing.method);
    const {
      label,
      amount,
      method,
      note,
      date,
      proof,
      proofs,
      tagIds,
      activityId,
      competitionId,
      allocations,
    } = parse(expenseUpdateSchema(accepted), await req.json());

    const data: {
      label?: string;
      amount?: number;
      method?: string | null;
      note?: string | null;
      date?: Date;
      proof?: string | null;
      tags?: { set: { id: string }[] };
      activityId?: string | null;
      competitionId?: string | null;
    } = {};

    if (label !== undefined) data.label = label;
    if (amount !== undefined) data.amount = Number(amount);
    if (method !== undefined) data.method = method?.trim() || null;

    if (note !== undefined) {
      data.note = note?.trim() || null;
    }

    if (date !== undefined) data.date = new Date(date as string);

    const held = (
      await prisma.expenseProof.findMany({
        where: { expenseId: id },
        orderBy: { createdAt: "asc" },
        select: { filename: true },
      })
    ).map((row) => row.filename);
    const wanted = proofs === undefined ? held : cleanProofNames(proofs);
    if (proofs !== undefined) data.proof = leadProof(wanted);
    else if (proof !== undefined) data.proof = proof;
    if (tagIds !== undefined) data.tags = { set: tagIds.map((id) => ({ id })) };

    const shares = await sharesForUpdate({
      id,
      total: data.amount ?? existing.amount,
      allocations,
      destinationGiven: activityId !== undefined || competitionId !== undefined,
      destination: { activityId, competitionId },
      amountGiven: amount !== undefined,
      existing,
    });
    if (shares) {
      const destination = legacyDestination(shares);
      data.activityId = destination.activityId;
      data.competitionId = destination.competitionId;
    }

    const expense = await prisma.$transaction(async (tx) => {
      const removed = proofsToRemove(held, wanted);
      const added = proofsToAdd(held, wanted);
      if (removed.length) {
        await tx.expenseProof.deleteMany({ where: { expenseId: id, filename: { in: removed } } });
      }
      if (added.length) {
        await tx.expenseProof.createMany({
          data: added.map((filename) => ({ expenseId: id, filename })),
        });
      }
      const saved = await tx.expense.update({
        where: { id },
        data,
        include: {
          ...EXPENSE_DESTINATION_SELECT,
          ...EXPENSE_PROOF_SELECT,
          ...EXPENSE_ALLOCATION_SELECT,
        },
      });

      if (shares) {
        await tx.expenseAllocation.deleteMany({ where: { expenseId: id } });
        await tx.expenseAllocation.createMany({
          data: shares.map((share) => ({
            expenseId: id,
            amount: share.amount,
            activityId: share.activityId,
            competitionId: share.competitionId,
          })),
        });
      }

      return saved;
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
      return NextResponse.json({ error: expenseMessages.notFound }, { status: 404 });
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
