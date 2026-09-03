import { money } from "./messages";
import { INITIAL_PAYMENT_METHODS } from "./paymentMethods";

export const MEMBERSHIP_FEE = 100;

export const ONLINE_PAYMENT_METHODS = INITIAL_PAYMENT_METHODS.filter(
  (method) => method.memberFacing,
).map((method) => method.name);
export const PAYMENT_METHODS = INITIAL_PAYMENT_METHODS.map((method) => method.name);

export function validatePaidAmount(v: unknown, fee: number = MEMBERSHIP_FEE): string | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n < fee) {
    return money.paidAmountTooLow(fee);
  }
  return null;
}
