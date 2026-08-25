import { prisma } from "./prisma";
import { PAYMENT_METHODS } from "./donations";
import { treasuryOf, type Treasury } from "./treasury";

export async function getTreasury(): Promise<Treasury> {
  const [payments, spent] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "ACTIVE" },
      select: { amount: true, purpose: true, feeApplied: true, method: true },
    }),
    prisma.expense.findMany({ select: { amount: true, method: true } }),
  ]);

  return treasuryOf(payments, spent, PAYMENT_METHODS);
}
