import type { ReviewStatus } from "@prisma/client";
import type { MembershipPaymentFields } from "./membershipPaymentRead";
import { readMoneyDate } from "./paymentDate";

export interface FeeEdit {
  amountTransferred?: number;
  paymentMethod?: string;
  accountId?: string | null;
  paymentProof?: string | null;
  bankReference?: string | null;
  paidOn?: unknown;
}

export type StandingFee = MembershipPaymentFields & { status: ReviewStatus };

export function touchesPayment(edit: FeeEdit): boolean {
  return (
    edit.amountTransferred !== undefined ||
    edit.paymentMethod !== undefined ||
    edit.accountId !== undefined ||
    edit.paymentProof !== undefined ||
    edit.bankReference !== undefined ||
    edit.paidOn !== undefined
  );
}

export function methodAfterEdit(edit: FeeEdit, current: StandingFee): string | null {
  return edit.paymentMethod !== undefined ? edit.paymentMethod : current.paymentMethod;
}

export function amountAfterEdit(edit: FeeEdit, before: number | null): number | null {
  return edit.amountTransferred !== undefined ? edit.amountTransferred : before;
}

export function feeAfterEdit(edit: FeeEdit, current: StandingFee) {
  return {
    method: methodAfterEdit(edit, current),
    accountId: edit.accountId !== undefined ? edit.accountId || null : current.accountId,
    bankReference:
      edit.bankReference !== undefined ? edit.bankReference || null : current.bankReference,
    proof: edit.paymentProof !== undefined ? edit.paymentProof : current.paymentProof,
    ...(edit.paidOn === undefined ? {} : { paidOn: readMoneyDate(edit.paidOn) }),
    referenceCode: current.referenceCode,
    status: current.status,
    reviewedBy: current.reviewedBy,
    reviewedAt: current.reviewedAt,
  };
}
