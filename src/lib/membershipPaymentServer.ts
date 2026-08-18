import type { Prisma, PrismaClient } from "@prisma/client";
import { splitPayment } from "./membershipPayment";

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
    return;
  }

  const { fee: banked, surplus } = splitPayment(total, fee);
  await db.member.update({ where: { id: memberId }, data: { paidAmount: banked } });

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
