import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export const MEMBERSHIP_PAYMENT_SELECT = {
  feeApplied: true,
  method: true,
  accountId: true,
  bankReference: true,
  proof: true,
  referenceCode: true,
  recordedBy: true,
  reviewedBy: true,
  reviewedAt: true,
} as const;

export interface MembershipPaymentRow {
  feeApplied: number | null;
  method: string | null;
  accountId: string | null;
  bankReference: string | null;
  proof: string | null;
  referenceCode: string | null;
  recordedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
}

export interface MembershipPaymentFields {
  feeApplied: number | null;
  paymentMethod: string | null;
  accountId: string | null;
  bankReference: string | null;
  paymentProof: string | null;
  referenceCode: string | null;
  recordedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
}

export const NO_MEMBERSHIP_PAYMENT: MembershipPaymentFields = {
  feeApplied: null,
  paymentMethod: null,
  accountId: null,
  bankReference: null,
  paymentProof: null,
  referenceCode: null,
  recordedBy: null,
  reviewedBy: null,
  reviewedAt: null,
};

export function membershipPaymentFields(
  payment: MembershipPaymentRow | null | undefined,
): MembershipPaymentFields {
  if (!payment) return { ...NO_MEMBERSHIP_PAYMENT };
  return {
    feeApplied: payment.feeApplied,
    paymentMethod: payment.method,
    accountId: payment.accountId,
    bankReference: payment.bankReference,
    paymentProof: payment.proof,
    referenceCode: payment.referenceCode,
    recordedBy: payment.recordedBy,
    reviewedBy: payment.reviewedBy,
    reviewedAt: payment.reviewedAt,
  };
}

export async function membershipPaymentOf(
  db: Db,
  userId: string,
  year: number,
): Promise<MembershipPaymentFields> {
  const payment = await db.payment.findFirst({
    where: { userId, year, purpose: "MEMBERSHIP" },
    select: MEMBERSHIP_PAYMENT_SELECT,
  });
  return membershipPaymentFields(payment);
}
