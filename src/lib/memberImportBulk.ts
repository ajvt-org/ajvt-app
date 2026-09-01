import { splitPayment } from "./membershipPayment";
import type { RowValues } from "./memberImportValues";

export interface BulkFill {
  age: string;
  paymentMethod: string;
  paidAmount: string;
}

export function bulkChange(fill: BulkFill): Partial<RowValues> {
  const change: Partial<RowValues> = {};
  if (fill.age) change.age = fill.age;
  if (fill.paymentMethod) {
    change.paid = true;
    change.paymentMethod = fill.paymentMethod;
    change.paidAmount = fill.paidAmount.trim();
  }
  return change;
}

export function bulkSurplus(paidAmount: string, fee: number): number {
  const written = paidAmount.trim();
  if (!written) return 0;

  const amount = Number(written);
  if (!Number.isInteger(amount)) return 0;

  return splitPayment(amount, fee).surplus;
}
