import type { Prisma, PrismaClient } from "@prisma/client";
import { mirrorMembershipPayment, mirrorMembershipStatus } from "./paymentMirror";
import { saveMembershipSnapshot, setMembershipStatus } from "./membershipRecord";

type Db = PrismaClient | Prisma.TransactionClient;

export async function recordMembershipPayment(
  db: Db,
  memberId: string,
  total: number | null,
  fee: number,
  // Only the first payment of a year carries the member's answer. A later
  // correction keeps whatever was published.
  choice?: boolean,
) {
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: {
      userId: true,
      status: true,
      rejectionReason: true,
      membershipYear: true,
      paymentProof: true,
      paymentMethod: true,
      referenceCode: true,
      user: { select: { fullName: true } },
    },
  });
  if (!member) return;

  const membershipYear = member.membershipYear;
  const userId = member.userId;
  const kept = await db.payment.findFirst({
    where: { userId, year: membershipYear, purpose: "MEMBERSHIP" },
    select: { anonymous: true },
  });
  const anonymous = kept?.anonymous ?? choice ?? false;

  const snapshot = {
    status: member.status,
    rejectionReason: member.rejectionReason,
    paymentMethod: member.paymentMethod,
    paymentProof: member.paymentProof,
    referenceCode: member.referenceCode,
  };

  if (total === null) {
    await saveMembershipSnapshot(db, userId, membershipYear, snapshot);
    await mirrorMembershipPayment(db, {
      userId,
      year: membershipYear,
      amount: null,
      feeApplied: fee,
      method: member.paymentMethod,
      proof: member.paymentProof,
      status: member.status,
      anonymous,
      donorName: anonymous ? null : member.user.fullName,
    });
    return;
  }

  await saveMembershipSnapshot(db, userId, membershipYear, snapshot);
  await mirrorMembershipPayment(db, {
    userId,
    year: membershipYear,
    amount: total,
    feeApplied: fee,
    method: member.paymentMethod,
    proof: member.paymentProof,
    status: member.status,
    anonymous,
    donorName: anonymous ? null : member.user.fullName,
  });
}

export async function syncSurplusStatus(db: Db, memberId: string, reviewedBy?: string) {
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { userId: true, status: true, rejectionReason: true, membershipYear: true },
  });
  if (!member) return;
  await mirrorMembershipStatus(db, member.userId, member.membershipYear, member.status);
  await setMembershipStatus(
    db,
    member.userId,
    member.membershipYear,
    {
      status: member.status,
      rejectionReason: member.rejectionReason,
      reviewedBy: reviewedBy ?? null,
    },
    new Date(),
  );
}

export async function setSurplusVisibility(db: Db, memberId: string, anonymous: boolean) {
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { userId: true, membershipYear: true, user: { select: { fullName: true } } },
  });
  if (!member) return;

  const donorName = anonymous ? null : member.user.fullName;
  const year = member.membershipYear;

  const userId = member.userId;
  await db.payment.updateMany({
    where: { userId, year, purpose: "MEMBERSHIP" },
    data: { anonymous, donorName },
  });
}

export async function totalPaidFor(db: Db, memberId: string): Promise<number | null> {
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { userId: true, membershipYear: true },
  });
  if (!member) return null;
  const payment = await db.payment.findFirst({
    where: { userId: member.userId, purpose: "MEMBERSHIP", year: member.membershipYear },
    select: { amount: true },
  });
  return payment?.amount ?? null;
}
