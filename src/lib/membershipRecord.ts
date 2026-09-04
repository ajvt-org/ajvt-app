import type { Prisma, PrismaClient, ReviewStatus } from "@prisma/client";
import { stampRecordedBy } from "./paymentMirror";

type Db = PrismaClient | Prisma.TransactionClient;

export interface MembershipYearEdit {
  status?: ReviewStatus;
  rejectionReason?: string | null;
  paymentMethod?: string | null;
  accountId?: string | null;
  paymentProof?: string | null;
  referenceCode?: string | null;
}

export async function saveMembershipYear(
  db: Db,
  userId: string,
  year: number,
  edit: MembershipYearEdit,
) {
  await db.membership.upsert({
    where: { userId_year: { userId, year } },
    update: edit,
    create: { userId, year, ...edit },
  });
}

export interface MembershipYearPayment {
  paymentMethod: string | null;
  accountId?: string | null;
  paymentProof: string | null;
  recordedBy?: string | null;
}

export async function recordMembershipYear(
  db: Db,
  userId: string,
  year: number,
  fee: number,
  payment: MembershipYearPayment,
) {
  await db.membership.upsert({
    where: { userId_year: { userId, year } },
    update: {},
    create: {
      userId,
      year,
      status: "ACTIVE",
      paymentMethod: payment.paymentMethod,
      accountId: payment.accountId ?? null,
      paymentProof: payment.paymentProof,
      recordedBy: payment.recordedBy ?? null,
      reviewedBy: payment.recordedBy ?? null,
    },
  });

  if (payment.recordedBy) {
    await db.membership.updateMany({
      where: { userId, year, recordedBy: null },
      data: { recordedBy: payment.recordedBy },
    });
    await stampRecordedBy(db, userId, year, payment.recordedBy);
  }
}

export interface MembershipVerdict {
  status: ReviewStatus;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
}

export async function setMembershipStatus(
  db: Db,
  userId: string,
  year: number,
  verdict: MembershipVerdict,
  now: Date,
) {
  await db.membership.updateMany({
    where: { userId, year },
    data: {
      status: verdict.status,
      rejectionReason: verdict.rejectionReason ?? null,
      ...(verdict.reviewedBy ? { reviewedBy: verdict.reviewedBy, reviewedAt: now } : {}),
    },
  });
}
