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
import { legacyDestination, resolveShares } from "@/lib/expenseSharesServer";
import { EXPENSE_DESTINATION_SELECT } from "@/lib/moneyDestination";
import { cleanProofNames, leadProof } from "@/lib/expenseProofs";
import { EXPENSE_ALLOCATION_SELECT, EXPENSE_PROOF_SELECT } from "@/lib/expenseProofsServer";

export const GET = withRoute("GET /api/admin/expenses", async () => {
  await requireArea(MONEY_AREAS.expenses);
  const expenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
    include: {
      ...EXPENSE_DESTINATION_SELECT,
      ...EXPENSE_PROOF_SELECT,
      ...EXPENSE_ALLOCATION_SELECT,
    },
  });
  return NextResponse.json({ expenses });
});

export const POST = withRoute("POST /api/admin/expenses", async (req: NextRequest) => {
  const session = await requireArea(MONEY_AREAS.expenses);
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
  } = parse(expenseCreateSchema(await offeredMethodNames()), await req.json());
  const files = cleanProofNames(proofs ?? [proof]);
  const n = Number(amount);
  const shares = allocations?.length
    ? await resolveShares(allocations, n)
    : [{ ...(await resolveMoneyDestination({ activityId, competitionId })), amount: n }];
  const destination = legacyDestination(shares);
  const parsedDate = date === undefined || date === null ? new Date() : new Date(date as string);

  const expense = await prisma.expense.create({
    data: {
      label,
      amount: n,
      method: method?.trim() || null,
      note: note?.trim() || null,
      proof: leadProof(files),
      proofs: files.length ? { create: files.map((filename) => ({ filename })) } : undefined,
      allocations: {
        create: shares.map((share) => ({
          amount: share.amount,
          activityId: share.activityId,
          competitionId: share.competitionId,
        })),
      },
      date: parsedDate,
      createdBy: session.username,
      tags: tagIds?.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
      activityId: destination.activityId,
      competitionId: destination.competitionId,
    },
    include: {
      ...EXPENSE_DESTINATION_SELECT,
      ...EXPENSE_PROOF_SELECT,
      ...EXPENSE_ALLOCATION_SELECT,
    },
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
