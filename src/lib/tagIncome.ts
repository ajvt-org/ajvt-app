import { splitPayment } from "./membershipPayment";

export interface TaggedPayment {
  purpose: string;
  amount: number;
  feeApplied: number | null;
}

export interface TagIncome {
  count: number;
  total: number;
}

export function givenAmount(payment: TaggedPayment): number {
  if (payment.purpose !== "MEMBERSHIP") return payment.amount;
  return splitPayment(payment.amount, payment.feeApplied ?? 0).surplus;
}

export function tagIncome(payments: TaggedPayment[]): TagIncome {
  const gifts = payments.filter(
    (payment) => payment.purpose !== "MEMBERSHIP" || givenAmount(payment) > 0,
  );
  return {
    count: gifts.length,
    total: gifts.reduce((sum, payment) => sum + givenAmount(payment), 0),
  };
}
