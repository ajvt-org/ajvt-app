import { money } from "./messages";

export const MEMBERSHIP_FEE = 100;

export function validatePaidAmount(v: unknown, fee: number = MEMBERSHIP_FEE): string | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n < fee) {
    return money.paidAmountTooLow(fee);
  }
  return null;
}
