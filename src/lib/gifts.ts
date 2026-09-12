import { splitPayment } from "./membershipPayment";

export interface GiftPayment {
  id: string;
  purpose: string;
  amount: number;
  feeApplied: number | null;
  status: string;
  source: string | null;
  method: string | null;
  createdAt: Date;
}

export interface MemberGift {
  id: string;
  amount: number;
  status: string;
  source: string;
  paymentMethod: string | null;
  createdAt: Date;
}

export function sourceOnRecord(purpose: string, recorded: string | null): string {
  if (purpose === "MEMBERSHIP") return "MEMBERSHIP";
  return recorded ?? "UNRECORDED";
}

export function givenAmount(row: Pick<GiftPayment, "purpose" | "amount" | "feeApplied">): number {
  if (row.purpose !== "MEMBERSHIP") return row.amount;
  return splitPayment(row.amount, row.feeApplied ?? 0).surplus;
}

export function memberGifts(payments: GiftPayment[]): MemberGift[] {
  return payments
    .map((row) => ({
      id: row.id,
      amount: givenAmount(row),
      status: row.status,
      source: sourceOnRecord(row.purpose, row.source),
      paymentMethod: row.method,
      createdAt: row.createdAt,
    }))
    .filter((gift) => gift.source !== "MEMBERSHIP" || gift.amount > 0)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
