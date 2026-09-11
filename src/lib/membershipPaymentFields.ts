export const MEMBERSHIP_PAYMENT_SELECT = {
  amount: true,
  feeApplied: true,
  year: true,
  method: true,
  proof: true,
  referenceCode: true,
  recordedBy: true,
} as const;

export interface MirroredPayment {
  year: number | null;
  method: string | null;
  proof: string | null;
  referenceCode: string | null;
}

export interface MirroredColumns {
  paymentMethod: string | null;
  paymentProof: string | null;
  referenceCode: string | null;
}

export function paymentOfYear<T extends { year: number | null }>(
  rows: T[],
  year: number,
): T | null {
  return rows.find((row) => row.year === year) ?? null;
}

export function mirroredColumns(payment: MirroredPayment | null): MirroredColumns {
  return {
    paymentMethod: payment?.method ?? null,
    paymentProof: payment?.proof ?? null,
    referenceCode: payment?.referenceCode ?? null,
  };
}
