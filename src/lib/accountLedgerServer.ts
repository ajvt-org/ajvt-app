import { prisma } from "./prisma";
import { orderedMethodNames } from "./paymentMethodsServer";
import { ledgerOf, type AccountSum, type MethodLedger } from "./accountLedger";
import { UNSPECIFIED_METHOD } from "./treasury";

export interface LedgerRange {
  from?: Date;
  to?: Date;
}

function within(range: LedgerRange) {
  if (!range.from && !range.to) return undefined;
  return { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) };
}

function sums(
  rows: { method: string | null; accountId: string | null; _sum: { amount: number | null } }[],
): AccountSum[] {
  return rows.map((row) => ({
    method: row.method,
    accountId: row.accountId,
    amount: row._sum.amount ?? 0,
  }));
}

export async function getAccountLedger(range: LedgerRange = {}): Promise<MethodLedger[]> {
  const when = within(range);

  const [received, paid, accounts, order] = await Promise.all([
    prisma.payment.groupBy({
      by: ["method", "accountId"],
      where: { status: "ACTIVE", ...(when ? { createdAt: when } : {}) },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["method", "accountId"],
      where: when ? { date: when } : {},
      _sum: { amount: true },
    }),
    prisma.paymentAccount.findMany({
      select: {
        id: true,
        code: true,
        label: true,
        closedAt: true,
        method: { select: { name: true } },
      },
    }),
    orderedMethodNames(),
  ]);

  return ledgerOf(
    sums(received),
    sums(paid),
    accounts.map((account) => ({
      id: account.id,
      code: account.code,
      label: account.label,
      closedAt: account.closedAt,
      method: account.method.name,
    })),
    order,
    UNSPECIFIED_METHOD,
  );
}
