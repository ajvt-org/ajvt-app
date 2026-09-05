import type { Prisma, PrismaClient } from "@prisma/client";
import type { AttachPlan, MoneyTable } from "./backfillAccounts";

type Tx = Prisma.TransactionClient;

function attach(db: Tx, table: MoneyTable, accountId: string, ids: string[]) {
  const where = { id: { in: ids }, accountId: null };
  if (table === "Payment") return db.payment.updateMany({ where, data: { accountId } });
  if (table === "Expense") return db.expense.updateMany({ where, data: { accountId } });
  if (table === "Membership") return db.membership.updateMany({ where, data: { accountId } });
  return db.donation.updateMany({ where, data: { accountId } });
}

export async function attachPlanned(db: PrismaClient, plan: AttachPlan[]): Promise<void> {
  await db.$transaction(async (tx) => {
    for (const one of plan) await attach(tx, one.table, one.accountId, one.ids);
  });
}
