import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export interface MembershipMirror {
  memberId: string;
  year: number;
  amount: number | null;
  feeApplied: number;
  method: string | null;
  proof: string | null;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  anonymous: boolean;
  donorName: string | null;
  recordedBy?: string | null;
}

export async function mirrorMembershipPayment(db: Db, m: MembershipMirror) {
  const existing = await db.payment.findFirst({
    where: { memberId: m.memberId, year: m.year, purpose: "MEMBERSHIP" },
    select: { id: true },
  });

  if (m.amount === null || m.amount <= 0) {
    if (existing) await db.payment.delete({ where: { id: existing.id } });
    return;
  }

  const data = {
    amount: m.amount,
    feeApplied: m.feeApplied,
    method: m.method,
    proof: m.proof,
    status: m.status,
  };

  if (existing) {
    await db.payment.update({ where: { id: existing.id }, data });
    return;
  }
  await db.payment.create({
    data: {
      ...data,
      purpose: "MEMBERSHIP",
      memberId: m.memberId,
      year: m.year,
      anonymous: m.anonymous,
      donorName: m.donorName,
      recordedBy: m.recordedBy ?? null,
    },
  });
}

export async function mirrorMembershipStatus(
  db: Db,
  memberId: string,
  year: number,
  status: "PENDING" | "ACTIVE" | "REJECTED",
) {
  await db.payment.updateMany({
    where: { memberId, year, purpose: "MEMBERSHIP" },
    data: { status },
  });
}

export interface DonationMirror {
  donationId: string;
  amount: number | null;
  method: string | null;
  proof: string | null;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  donorName: string | null;
  donorPhoto: string | null;
  donorPhone: string | null;
  memberId: string | null;
  activityId: string | null;
  tagIds?: string[];
}

export async function mirrorDonation(db: Db, d: DonationMirror) {
  const existing = await db.payment.findFirst({
    where: { id: d.donationId },
    select: { id: true },
  });

  if (d.amount === null) {
    if (existing) await db.payment.delete({ where: { id: existing.id } });
    return;
  }

  const data = {
    purpose: d.activityId ? ("ACTIVITY" as const) : ("DONATION" as const),
    amount: d.amount,
    method: d.method,
    proof: d.proof,
    status: d.status,
    anonymous: d.donorName === null,
    donorName: d.donorName,
    donorPhoto: d.donorPhoto,
    donorPhone: d.donorPhone,
    memberId: d.memberId,
    activityId: d.activityId,
  };

  if (existing) {
    await db.payment.update({
      where: { id: existing.id },
      data: { ...data, ...(d.tagIds ? { tags: { set: d.tagIds.map((id) => ({ id })) } } : {}) },
    });
    return;
  }
  await db.payment.create({
    data: {
      ...data,
      id: d.donationId,
      ...(d.tagIds ? { tags: { connect: d.tagIds.map((id) => ({ id })) } } : {}),
    },
  });
}

export async function removeMirroredDonation(db: Db, donationId: string) {
  await db.payment.deleteMany({ where: { id: donationId } });
}
