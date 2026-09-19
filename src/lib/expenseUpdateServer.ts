import { prisma } from "./prisma";
import { ValidationError } from "./errors";
import { readMoneyDate } from "./paymentDate";
import { sharesForUpdate } from "./expenseSharesServer";
import { cleanProofNames, proofsToAdd, proofsToRemove } from "./expenseProofs";
import { accountIdError } from "./paymentAccountsServer";
import { releaseUploads } from "./uploadRelease";
import { EXPENSE_INCLUDE, heldProofs, type Allocation } from "./expensesServer";

export interface ExpenseEdit {
  label?: string;
  amount?: unknown;
  method?: string | null;
  accountId?: string | null;
  note?: string | null;
  date?: unknown;
  proof?: string | null;
  proofs?: string[];
  tagIds?: string[];
  activityId?: string | null;
  competitionId?: string | null;
  allocations?: Allocation[];
}

interface HeldExpense {
  amount: number;
  method: string | null;
  accountId: string | null;
}

interface ExpenseData {
  label?: string;
  amount?: number;
  method?: string | null;
  accountId?: string | null;
  note?: string | null;
  date?: Date;
  tags?: { set: { id: string }[] };
}

export async function updateExpense(id: string, existing: HeldExpense, edit: ExpenseEdit) {
  const data: ExpenseData = {};

  if (edit.label !== undefined) data.label = edit.label;
  if (edit.amount !== undefined) data.amount = Number(edit.amount);
  if (edit.method !== undefined) data.method = edit.method?.trim() || null;

  if (edit.accountId !== undefined) {
    const named = edit.method !== undefined ? edit.method : existing.method;
    const wrong = await accountIdError(named, edit.accountId, existing.accountId);
    if (wrong) throw new ValidationError(wrong);
    data.accountId = edit.accountId || null;
  }

  if (edit.note !== undefined) data.note = edit.note?.trim() || null;

  const movedOn = readMoneyDate(edit.date);
  if (movedOn) data.date = movedOn;

  const held = await heldProofs(id);
  const given =
    edit.proofs !== undefined ? edit.proofs : edit.proof !== undefined ? [edit.proof] : undefined;
  const wanted = given === undefined ? held : cleanProofNames(given);
  if (edit.tagIds !== undefined) data.tags = { set: edit.tagIds.map((tagId) => ({ id: tagId })) };

  const shares = await sharesForUpdate({
    id,
    total: data.amount ?? existing.amount,
    allocations: edit.allocations,
    destinationGiven: edit.activityId !== undefined || edit.competitionId !== undefined,
    destination: { activityId: edit.activityId, competitionId: edit.competitionId },
    amountGiven: edit.amount !== undefined,
  });

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

    return tx.expense.update({ where: { id }, data, include: EXPENSE_INCLUDE });
  });

  await releaseUploads(...proofsToRemove(held, wanted));

  return { expense, wanted };
}
