import { prisma } from "./prisma";
import type { AccountUsage } from "./paymentMethodAdmin";
import { money } from "./messages";

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

export async function accountIdError(
  methodName: string | null | undefined,
  accountId: string | null | undefined,
  held: string | null,
): Promise<string | null> {
  if (!accountId) return null;
  const name = methodName?.trim();
  const found = name
    ? await prisma.paymentAccount.findFirst({
        where: { id: accountId, method: { name } },
        select: { id: true, active: true, closedAt: true },
      })
    : null;
  if (!found) return money.paymentAccountInvalid;
  const open = found.active && found.closedAt === null;
  return open || accountId === held ? null : money.paymentAccountInvalid;
}
