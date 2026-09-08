import { paymentDate } from "@/lib/paymentDate";
import type { Proof } from "./paymentTypes";

export const PAYMENT_SORTS = ["newest", "oldest", "largest", "smallest"] as const;

export type PaymentSort = (typeof PAYMENT_SORTS)[number];

export const DEFAULT_SORT: PaymentSort = "newest";

export function readPaymentSort(value: string | null): PaymentSort {
  return PAYMENT_SORTS.includes(value as PaymentSort) ? (value as PaymentSort) : DEFAULT_SORT;
}

function paidAt(proof: Proof): number {
  return new Date(paymentDate({ paidOn: proof.paidOn, createdAt: proof.submittedAt })).getTime();
}

function byAmount(a: Proof, b: Proof, larger: boolean): number {
  if (a.amount === null && b.amount === null) return paidAt(b) - paidAt(a);
  if (a.amount === null) return 1;
  if (b.amount === null) return -1;
  const gap = larger ? b.amount - a.amount : a.amount - b.amount;
  return gap !== 0 ? gap : paidAt(b) - paidAt(a);
}

export function sortPayments(proofs: Proof[], sort: PaymentSort): Proof[] {
  const ordered = [...proofs];
  if (sort === "oldest") return ordered.sort((a, b) => paidAt(a) - paidAt(b));
  if (sort === "largest") return ordered.sort((a, b) => byAmount(a, b, true));
  if (sort === "smallest") return ordered.sort((a, b) => byAmount(a, b, false));
  return ordered.sort((a, b) => paidAt(b) - paidAt(a));
}
