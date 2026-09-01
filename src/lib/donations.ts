import { money } from "./messages";

export const MEMBERSHIP_FEE = 100;

export const ONLINE_PAYMENT_METHODS = ["بنكيلي", "السداد", "مصرفي"];
export const PAYMENT_METHODS = [...ONLINE_PAYMENT_METHODS, "نقداً"];

export function validatePaidAmount(v: unknown, fee: number = MEMBERSHIP_FEE): string | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n < fee) {
    return money.paidAmountTooLow(fee);
  }
  return null;
}
