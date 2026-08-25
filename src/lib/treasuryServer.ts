import { prisma } from "./prisma";
import { PAYMENT_METHODS } from "./donations";
import { treasuryOf, type Treasury } from "./treasury";

export async function getTreasury(): Promise<Treasury> {
  const [payments, spent] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "ACTIVE" },
      select: { amount: true, purpose: true, feeApplied: true, method: true },
    }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
  ]);

  return treasuryOf(payments, spent._sum.amount ?? 0, PAYMENT_METHODS);
}
