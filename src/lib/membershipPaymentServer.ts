import type { Prisma, PrismaClient } from "@prisma/client";
import { mirrorMembershipPayment, mirrorMembershipStatus } from "./paymentMirror";
import { setMembershipStatus } from "./membershipRecord";
import { currentMembership } from "./currentMembershipServer";

type Db = PrismaClient | Prisma.TransactionClient;

export async function recordMembershipPayment(
  db: Db,
  userId: string,
  total: number | null,
  fee: number,
  choice?: boolean,
) {
  const membership = await currentMembership(db, userId);
  if (!membership) return;

  const account = await db.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });
  const kept = await db.payment.findFirst({
    where: { userId, year: membership.year, purpose: "MEMBERSHIP" },
    select: { anonymous: true },
  });
  const anonymous = kept?.anonymous ?? choice ?? false;

  await mirrorMembershipPayment(db, {
    userId,
    year: membership.year,
    amount: total,
    feeApplied: fee,
    method: membership.paymentMethod,
    proof: membership.paymentProof,
    status: membership.status,
    anonymous,
    donorName: anonymous ? null : (account?.fullName ?? null),
  });
}

export async function syncSurplusStatus(db: Db, userId: string, reviewedBy?: string) {
  const membership = await currentMembership(db, userId);
  if (!membership) return;

  await mirrorMembershipStatus(db, userId, membership.year, membership.status);
  await setMembershipStatus(
    db,
    userId,
    membership.year,
    {
      status: membership.status,
      rejectionReason: membership.rejectionReason,
      reviewedBy: reviewedBy ?? null,
    },
    new Date(),
  );
}

export async function setSurplusVisibility(db: Db, userId: string, anonymous: boolean) {
  const membership = await currentMembership(db, userId);
  if (!membership) return;

  const account = await db.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });

  await db.payment.updateMany({
    where: { userId, year: membership.year, purpose: "MEMBERSHIP" },
    data: { anonymous, donorName: anonymous ? null : (account?.fullName ?? null) },
  });
}

export async function totalPaidFor(db: Db, userId: string): Promise<number | null> {
  const membership = await currentMembership(db, userId);
  if (!membership) return null;

  const payment = await db.payment.findFirst({
    where: { userId, purpose: "MEMBERSHIP", year: membership.year },
    select: { amount: true },
  });
  return payment?.amount ?? null;
}
