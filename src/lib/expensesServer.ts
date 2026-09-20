import { prisma } from "./prisma";
import { NotFoundError, ValidationError } from "./errors";
import { expenses as messages } from "./messages";
import { readMoneyDate } from "./paymentDate";
import { resolveMoneyDestination } from "./moneyDestinationServer";
import { resolveShares } from "./expenseSharesServer";
import { cleanProofNames } from "./expenseProofs";
import { EXPENSE_ALLOCATION_SELECT, EXPENSE_PROOF_SELECT } from "./expenseProofsServer";
import { accountIdError } from "./paymentAccountsServer";
import { releaseUploads } from "./uploadRelease";

export const EXPENSE_INCLUDE = {
  tags: { select: { id: true, name: true } },
  ...EXPENSE_PROOF_SELECT,
  ...EXPENSE_ALLOCATION_SELECT,
} as const;

export interface Allocation {
  activityId?: string | null;
  competitionId?: string | null;
  amount: unknown;
}

export interface NewExpense {
  label: string;
  amount: unknown;
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

export async function listExpenses() {
  return prisma.expense.findMany({
    orderBy: { date: "desc" },
    include: { ...EXPENSE_INCLUDE, account: { select: { id: true, code: true, label: true } } },
  });
}

export async function expenseOrNotFound(id: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(messages.notFound);
  return existing;
}

export async function heldProofs(expenseId: string): Promise<string[]> {
  const rows = await prisma.expenseProof.findMany({
    where: { expenseId },
    orderBy: { createdAt: "asc" },
    select: { filename: true },
  });
  return rows.map((row) => row.filename);
}

export async function createExpense(input: NewExpense, createdBy: string) {
  const files = cleanProofNames(input.proofs ?? [input.proof]);
  const total = Number(input.amount);
  const shares = input.allocations?.length
    ? await resolveShares(input.allocations, total)
    : [
        {
          ...(await resolveMoneyDestination({
            activityId: input.activityId,
            competitionId: input.competitionId,
          })),
          amount: total,
        },
      ];
  const spentOn = readMoneyDate(input.date) ?? new Date();

  const wrongAccount = await accountIdError(input.method, input.accountId, null);
  if (wrongAccount) throw new ValidationError(wrongAccount);

  const expense = await prisma.expense.create({
    data: {
      label: input.label,
      amount: total,
      method: input.method?.trim() || null,
      accountId: input.accountId || null,
      note: input.note?.trim() || null,
      proofs: files.length ? { create: files.map((filename) => ({ filename })) } : undefined,
      allocations: {
        create: shares.map((share) => ({
          amount: share.amount,
          activityId: share.activityId,
          competitionId: share.competitionId,
        })),
      },
      date: spentOn,
      createdBy,
      tags: input.tagIds?.length ? { connect: input.tagIds.map((id) => ({ id })) } : undefined,
    },
    include: EXPENSE_INCLUDE,
  });

  return { expense, files };
}

export async function removeExpense(id: string) {
  const existing = await expenseOrNotFound(id);
  const held = await heldProofs(id);

  await prisma.expense.delete({ where: { id } });
  await releaseUploads(...held);

  return existing;
}
