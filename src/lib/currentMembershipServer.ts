import type { Prisma, PrismaClient } from "@prisma/client";
import { latestByAccount, latestMembership } from "./currentMembership";
import { membershipPaymentOf } from "./membershipPaymentRead";

type Db = PrismaClient | Prisma.TransactionClient;

export const MEMBERSHIP_SELECT = {
  id: true,
  userId: true,
  year: true,
  status: true,
  rejectionReason: true,
  paymentMethod: true,
  accountId: true,
  bankReference: true,
  paymentProof: true,
  referenceCode: true,
  reviewedBy: true,
  reviewedAt: true,
  endedAt: true,
  endedReason: true,
  endedBy: true,
  createdAt: true,
} as const;

export async function currentMembership(db: Db, userId: string) {
  const rows = await db.membership.findMany({ where: { userId }, select: MEMBERSHIP_SELECT });
  return latestMembership(rows);
}

export async function currentMembershipPaid(db: Db, userId: string) {
  const membership = await currentMembership(db, userId);
  if (!membership) return null;
  return { ...membership, ...(await membershipPaymentOf(db, userId, membership.year)) };
}

export async function currentMemberships(db: Db) {
  const rows = await db.membership.findMany({
    select: { userId: true, year: true, status: true, endedAt: true },
  });
  return [...latestByAccount(rows).values()];
}
