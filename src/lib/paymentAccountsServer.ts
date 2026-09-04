import { prisma } from "./prisma";
import type { AccountUsage } from "./paymentMethodAdmin";

const SELECT = {
  id: true,
  code: true,
  label: true,
  position: true,
  active: true,
  closedAt: true,
} as const;

export async function accountsOf(methodId: string) {
  return prisma.paymentAccount.findMany({ where: { methodId }, select: SELECT });
}

export async function accountUsage(): Promise<AccountUsage[]> {
  const [expenses, payments, donations, memberships] = await Promise.all([
    prisma.expense.groupBy({ by: ["accountId"], _count: { _all: true } }),
    prisma.payment.groupBy({ by: ["accountId"], _count: { _all: true } }),
    prisma.donation.groupBy({ by: ["accountId"], _count: { _all: true } }),
    prisma.membership.groupBy({ by: ["accountId"], _count: { _all: true } }),
  ]);
  return [...expenses, ...payments, ...donations, ...memberships].map((row) => ({
    accountId: row.accountId,
    count: row._count._all,
  }));
}
