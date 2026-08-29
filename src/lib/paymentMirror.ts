import type { Prisma, PrismaClient } from "@prisma/client";
import { ensureReceiptsFor, syncReceiptsFor } from "./paymentReceiptServer";

type Db = PrismaClient | Prisma.TransactionClient;

export interface MembershipMirror {
  memberId: string;
  userId: string;
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
    where: { userId: m.userId, year: m.year, purpose: "MEMBERSHIP" },
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
    await syncReceiptsFor(db, { id: existing.id });
    return;
  }
  const created = await db.payment.create({
    data: {
      ...data,
      purpose: "MEMBERSHIP",
      memberId: m.memberId,
      userId: m.userId,
      year: m.year,
      anonymous: m.anonymous,
      donorName: m.donorName,
      recordedBy: m.recordedBy ?? null,
    },
  });
  await ensureReceiptsFor(db, { id: created.id });
}

export async function mirrorMembershipStatus(
  db: Db,
  userId: string,
  year: number,
  status: "PENDING" | "ACTIVE" | "REJECTED",
) {
  await db.payment.updateMany({
    where: { userId, year, purpose: "MEMBERSHIP" },
    data: { status },
  });
  await syncReceiptsFor(db, { userId, year, purpose: "MEMBERSHIP" });
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
  userId: string | null;
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
    userId: d.userId,
    activityId: d.activityId,
  };

  if (existing) {
    await db.payment.update({
      where: { id: existing.id },
      data: { ...data, ...(d.tagIds ? { tags: { set: d.tagIds.map((id) => ({ id })) } } : {}) },
    });
    await syncReceiptsFor(db, { id: existing.id });
    return;
  }
  await db.payment.create({
    data: {
      ...data,
      id: d.donationId,
      ...(d.tagIds ? { tags: { connect: d.tagIds.map((id) => ({ id })) } } : {}),
    },
  });
  await ensureReceiptsFor(db, { id: d.donationId });
}

export async function removeMirroredDonation(db: Db, donationId: string) {
  await db.payment.deleteMany({ where: { id: donationId } });
}

// The admin who recorded a year is stamped on the membership row after the
// payment itself was written, and only the first time: a later edit does not
// take the year away from whoever took it.
export async function stampRecordedBy(db: Db, userId: string, year: number, username: string) {
  await db.payment.updateMany({
    where: { userId, year, purpose: "MEMBERSHIP", recordedBy: null },
    data: { recordedBy: username },
  });
}
