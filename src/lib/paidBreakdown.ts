import { splitPayment } from "./membershipPayment";

export interface SurplusRow {
  amount: number | null;
  membershipYear: number | null;
}

export interface PaidBreakdown {
  fee: number;
  support: number;
  total: number;
}

export function surplusForYear(rows: SurplusRow[], year: number): number {
  return rows.filter((r) => r.membershipYear === year).reduce((sum, r) => sum + (r.amount ?? 0), 0);
}

export function paidBreakdown(fee: number | null, support: number): PaidBreakdown | null {
  if (fee === null) return null;
  const banked = Math.max(0, fee);
  const extra = Math.max(0, support);
  return { fee: banked, support: extra, total: banked + extra };
}

export interface MembershipPaymentRow {
  amount: number;
  feeApplied: number | null;
  year: number | null;
}

export function paidForYear(rows: MembershipPaymentRow[], year: number): PaidBreakdown | null {
  const row = rows.find((r) => r.year === year);
  if (!row) return null;
  const { fee, surplus } = splitPayment(row.amount, row.feeApplied ?? 0);
  return { fee, support: surplus, total: fee + surplus };
}
