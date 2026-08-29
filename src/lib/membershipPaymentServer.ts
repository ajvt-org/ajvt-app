import type { Prisma, PrismaClient } from "@prisma/client";
import { splitPayment } from "./membershipPayment";
import { mirrorMembershipPayment, mirrorMembershipStatus } from "./paymentMirror";
import { saveMembershipSnapshot, setMembershipStatus } from "./membershipRecord";

type Db = PrismaClient | Prisma.TransactionClient;

export async function recordMembershipPayment(
  db: Db,
  memberId: string,
  total: number | null,
  fee: number,
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
      surplusAnonymous: true,
      user: { select: { fullName: true } },
    },
  });
  if (!member) return;

  const membershipYear = member.membershipYear;
  const userId = member.userId;
  const existing = await db.donation.findFirst({
    where: { userId, source: "MEMBERSHIP", membershipYear },
    select: { id: true },
  });

  const snapshot = {
    status: member.status,
    rejectionReason: member.rejectionReason,
    paymentMethod: member.paymentMethod,
    paymentProof: member.paymentProof,
    referenceCode: member.referenceCode,
    surplusAnonymous: member.surplusAnonymous,
  };

  if (total === null) {
    await db.member.update({ where: { id: memberId }, data: { paidAmount: null } });
    await saveMembershipSnapshot(db, userId, membershipYear, { ...snapshot, paidAmount: null });
    if (existing) await db.donation.delete({ where: { id: existing.id } });
    await mirrorMembershipPayment(db, {
      memberId,
      userId,
      year: membershipYear,
      amount: null,
      feeApplied: fee,
      method: member.paymentMethod,
      proof: member.paymentProof,
      status: member.status,
      anonymous: member.surplusAnonymous,
      donorName: member.surplusAnonymous ? null : member.user.fullName,
    });
    return;
  }

  const { fee: banked, surplus } = splitPayment(total, fee);
  await db.member.update({ where: { id: memberId }, data: { paidAmount: banked } });
  await saveMembershipSnapshot(db, userId, membershipYear, { ...snapshot, paidAmount: banked });
  await mirrorMembershipPayment(db, {
    memberId,
    userId,
    year: membershipYear,
    amount: total,
    feeApplied: fee,
    method: member.paymentMethod,
    proof: member.paymentProof,
    status: member.status,
    anonymous: member.surplusAnonymous,
    donorName: member.surplusAnonymous ? null : member.user.fullName,
  });

  if (surplus === 0) {
    if (existing) await db.donation.delete({ where: { id: existing.id } });
    return;
  }

  const data = {
    amount: surplus,
    proof: member.paymentProof,
    paymentMethod: member.paymentMethod,
    status: member.status,
  };
  if (existing) {
    await db.donation.update({ where: { id: existing.id }, data });
  } else {
    await db.donation.create({
      data: {
        ...data,
        donorName: member.surplusAnonymous ? null : member.user.fullName,
        memberId,
        userId,
        membershipYear,
        source: "MEMBERSHIP",
      },
    });
  }
}

export async function syncSurplusStatus(db: Db, memberId: string, reviewedBy?: string) {
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { userId: true, status: true, rejectionReason: true, membershipYear: true },
  });
  if (!member) return;
  await db.donation.updateMany({
    where: { userId: member.userId, source: "MEMBERSHIP", membershipYear: member.membershipYear },
    data: { status: member.status },
  });
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
  await db.member.update({ where: { id: memberId }, data: { surplusAnonymous: anonymous } });
  await db.membership.updateMany({
    where: { userId, year },
    data: { surplusAnonymous: anonymous },
  });
  await db.donation.updateMany({
    where: { userId, source: "MEMBERSHIP", membershipYear: year },
    data: { donorName },
  });
  await db.payment.updateMany({
    where: { userId, year, purpose: "MEMBERSHIP" },
    data: { anonymous, donorName },
  });
}

export async function totalPaidFor(db: Db, memberId: string): Promise<number | null> {
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { userId: true, paidAmount: true, membershipYear: true },
  });
  if (!member || member.paidAmount === null) return null;
  const surplus = await db.donation.findFirst({
    where: { userId: member.userId, source: "MEMBERSHIP", membershipYear: member.membershipYear },
    select: { amount: true },
  });
  return member.paidAmount + (surplus?.amount ?? 0);
}
