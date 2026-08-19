import type { Prisma, PrismaClient } from "@prisma/client";
import { splitPayment } from "./membershipPayment";
import { mirrorMembershipPayment, mirrorMembershipStatus } from "./paymentMirror";

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
      status: true,
      fullName: true,
      membershipYear: true,
      paymentProof: true,
      paymentMethod: true,
      surplusAnonymous: true,
    },
  });
  if (!member) return;

  const membershipYear = member.membershipYear;
  const existing = await db.donation.findFirst({
    where: { memberId, source: "MEMBERSHIP", membershipYear },
    select: { id: true },
  });

  if (total === null) {
    await db.member.update({ where: { id: memberId }, data: { paidAmount: null } });
    if (existing) await db.donation.delete({ where: { id: existing.id } });
    await mirrorMembershipPayment(db, {
      memberId,
      year: membershipYear,
      amount: null,
      feeApplied: fee,
      method: member.paymentMethod,
      proof: member.paymentProof,
      status: member.status,
      anonymous: member.surplusAnonymous,
      donorName: member.surplusAnonymous ? null : member.fullName,
    });
    return;
  }

  const { fee: banked, surplus } = splitPayment(total, fee);
  await db.member.update({ where: { id: memberId }, data: { paidAmount: banked } });
  await mirrorMembershipPayment(db, {
    memberId,
    year: membershipYear,
    amount: total,
    feeApplied: fee,
    method: member.paymentMethod,
    proof: member.paymentProof,
    status: member.status,
    anonymous: member.surplusAnonymous,
    donorName: member.surplusAnonymous ? null : member.fullName,
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
        donorName: member.surplusAnonymous ? null : member.fullName,
        memberId,
        membershipYear,
        source: "MEMBERSHIP",
      },
    });
  }
}

export async function syncSurplusStatus(db: Db, memberId: string) {
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { status: true, membershipYear: true },
  });
  if (!member) return;
  await db.donation.updateMany({
    where: { memberId, source: "MEMBERSHIP", membershipYear: member.membershipYear },
    data: { status: member.status },
  });
  await mirrorMembershipStatus(db, memberId, member.membershipYear, member.status);
}

// The one path that rewrites a year already published: the member asking for
// their own surplus to change name. Both shapes are written, so the mirror
// cannot drift from the donation it copies.
export async function setSurplusVisibility(db: Db, memberId: string, anonymous: boolean) {
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { fullName: true, membershipYear: true },
  });
  if (!member) return;

  const donorName = anonymous ? null : member.fullName;
  const year = member.membershipYear;

  await db.member.update({ where: { id: memberId }, data: { surplusAnonymous: anonymous } });
  await db.donation.updateMany({
    where: { memberId, source: "MEMBERSHIP", membershipYear: year },
    data: { donorName },
  });
  await db.payment.updateMany({
    where: { memberId, year, purpose: "MEMBERSHIP" },
    data: { anonymous, donorName },
  });
}

export async function totalPaidFor(db: Db, memberId: string): Promise<number | null> {
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { paidAmount: true, membershipYear: true },
  });
  if (!member || member.paidAmount === null) return null;
  const surplus = await db.donation.findFirst({
    where: { memberId, source: "MEMBERSHIP", membershipYear: member.membershipYear },
    select: { amount: true },
  });
  return member.paidAmount + (surplus?.amount ?? 0);
}
