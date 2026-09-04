import { prisma } from "./prisma";
import { orderedMethodNames } from "./paymentMethodsServer";
import { treasuryOf, type Treasury } from "./treasury";

export async function getTreasury(): Promise<Treasury> {
  const [payments, spent, order] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "ACTIVE" },
      select: { amount: true, purpose: true, feeApplied: true, method: true },
    }),
    prisma.expense.findMany({ select: { amount: true, method: true } }),
    orderedMethodNames(),
  ]);

  return treasuryOf(payments, spent, order);
}
