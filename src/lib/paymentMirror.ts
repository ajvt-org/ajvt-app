import type { Prisma, PrismaClient } from "@prisma/client";
import {
  ensureReceiptsFor,
  syncReceiptsFor,
  withdrawReceiptsBeforeDelete,
} from "./paymentReceiptServer";

type Db = PrismaClient | Prisma.TransactionClient;

export function isPaidAmount(amount: number | null): amount is number {
  return amount !== null && amount > 0;
}

export function arrivalOf(source: string): string | null {
  return source === "MEMBERSHIP" ? null : source;
}

export interface DonationMirror {
  donationId: string;
  amount: number | null;
  anonymous: boolean;
  method: string | null;
  accountId: string | null;
  bankReference: string | null;
  proof: string | null;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  source: string | null;
  donorName: string | null;
  donorPhoto: string | null;
  donorPhone: string | null;
  userId: string | null;
  activityId: string | null;
  competitionId: string | null;
  paidOn?: Date | null;
  tagIds?: string[];
}

export interface MirroredDonation {
  id: string;
  amount: number | null;
  anonymous: boolean;
  paymentMethod: string | null;
  accountId: string | null;
  bankReference: string | null;
  proof: string | null;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  source: string;
  donorName: string | null;
  donorPhoto: string | null;
  donorPhone: string | null;
  userId: string | null;
  activityId: string | null;
  competitionId: string | null;
}

export function donationMirrorOf(
  donation: MirroredDonation,
  tagIds?: string[],
  paidOn?: Date | null,
): DonationMirror {
  return {
    donationId: donation.id,
    amount: donation.amount,
    anonymous: donation.anonymous,
    method: donation.paymentMethod,
    accountId: donation.accountId,
    bankReference: donation.bankReference,
    proof: donation.proof,
    status: donation.status,
    source: arrivalOf(donation.source),
    donorName: donation.donorName,
    donorPhoto: donation.donorPhoto,
    donorPhone: donation.donorPhone,
    userId: donation.userId,
    activityId: donation.activityId,
    competitionId: donation.competitionId,
    ...(paidOn === undefined ? {} : { paidOn }),
    ...(tagIds ? { tagIds } : {}),
  };
}

export async function mirrorDonation(db: Db, d: DonationMirror) {
  const existing = await db.payment.findUnique({
    where: { id: d.donationId },
    select: { id: true },
  });

  if (!isPaidAmount(d.amount)) {
    if (existing) {
      await withdrawReceiptsBeforeDelete(db, { id: existing.id });
      await db.payment.delete({ where: { id: existing.id } });
    }
    return;
  }

  const data = {
    purpose: d.activityId || d.competitionId ? ("ACTIVITY" as const) : ("DONATION" as const),
    amount: d.amount,
    method: d.method,
    accountId: d.accountId,
    bankReference: d.bankReference,
    proof: d.proof,
    status: d.status,
    anonymous: d.anonymous,
    source: d.source,
    donorName: d.donorName,
    donorPhoto: d.donorPhoto,
    donorPhone: d.donorPhone,
    userId: d.userId,
    activityId: d.activityId,
    competitionId: d.competitionId,
  };

  if (existing) {
    await db.payment.update({
      where: { id: existing.id },
      data: {
        ...data,
        ...(d.paidOn === undefined ? {} : { paidOn: d.paidOn }),
        ...(d.tagIds ? { tags: { set: d.tagIds.map((id) => ({ id })) } } : {}),
      },
    });
    await syncReceiptsFor(db, { id: existing.id });
    return;
  }
  await db.payment.create({
    data: {
      ...data,
      id: d.donationId,
      paidOn: d.paidOn ?? new Date(),
      ...(d.tagIds ? { tags: { connect: d.tagIds.map((id) => ({ id })) } } : {}),
    },
  });
  await ensureReceiptsFor(db, { id: d.donationId });
}

export async function removeMirroredDonation(db: Db, donationId: string) {
  await withdrawReceiptsBeforeDelete(db, { id: donationId });
  await db.payment.deleteMany({ where: { id: donationId } });
}
