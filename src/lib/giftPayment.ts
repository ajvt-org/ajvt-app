import type { PaymentPurpose, Prisma } from "@prisma/client";
import { DONOR_ACCOUNT_SELECT } from "./donorName";
import type { MoneyDestination } from "./moneyDestination";

export const GIFT_SELECT = {
  id: true,
  purpose: true,
  anonymous: true,
  donorName: true,
  donorPhone: true,
  donorPhoto: true,
  amount: true,
  proof: true,
  status: true,
  source: true,
  method: true,
  accountId: true,
  bankReference: true,
  userId: true,
  activityId: true,
  competitionId: true,
  paidOn: true,
  createdAt: true,
  updatedAt: true,
  user: { select: DONOR_ACCOUNT_SELECT },
} as const;

export type GiftPayment = Prisma.PaymentGetPayload<{ select: typeof GIFT_SELECT }>;

export function giftPurpose(destination: MoneyDestination): PaymentPurpose {
  return destination.activityId || destination.competitionId ? "ACTIVITY" : "DONATION";
}

export function isMembershipMoney(payment: { purpose: PaymentPurpose }): boolean {
  return payment.purpose === "MEMBERSHIP";
}

export function giftRow(payment: GiftPayment) {
  return {
    id: payment.id,
    anonymous: payment.anonymous,
    donorName: payment.donorName,
    donorPhone: payment.donorPhone,
    donorPhoto: payment.donorPhoto,
    amount: payment.amount,
    proof: payment.proof,
    status: payment.status,
    source: payment.source,
    paymentMethod: payment.method,
    accountId: payment.accountId,
    bankReference: payment.bankReference,
    userId: payment.userId,
    activityId: payment.activityId,
    competitionId: payment.competitionId,
    paidOn: payment.paidOn,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    user: payment.user,
  };
}
