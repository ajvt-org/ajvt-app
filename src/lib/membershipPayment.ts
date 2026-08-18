export interface PaymentSplit {
  fee: number;
  surplus: number;
}

export function splitPayment(total: number, fee: number): PaymentSplit {
  if (!Number.isInteger(total) || !Number.isInteger(fee) || total < 0 || fee < 0) {
    return { fee: 0, surplus: 0 };
  }
  if (total <= fee) return { fee: total, surplus: 0 };
  return { fee, surplus: total - fee };
}

export function totalPaid(split: PaymentSplit): number {
  return split.fee + split.surplus;
}

export function hasSurplus(total: number, fee: number): boolean {
  return splitPayment(total, fee).surplus > 0;
}
