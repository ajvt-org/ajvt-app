import type { Prisma, PrismaClient, ReviewStatus } from "@prisma/client";
import { splitPayment } from "./membershipPayment";
import { stampRecordedBy } from "./paymentMirror";
import { memberOf } from "./memberAccount";

type Db = PrismaClient | Prisma.TransactionClient;

export interface MembershipEdit {
  paidAmount?: number | null;
  paymentMethod?: string | null;
  paymentProof?: string | null;
}

export function membershipEdit(data: MembershipEdit): MembershipEdit {
  const edit: MembershipEdit = {};
  if (data.paidAmount !== undefined) edit.paidAmount = data.paidAmount;
  if (data.paymentMethod !== undefined) edit.paymentMethod = data.paymentMethod;
  if (data.paymentProof !== undefined) edit.paymentProof = data.paymentProof;
  return edit;
}

export async function syncMembershipRecord(
  db: Db,
  userId: string,
  year: number,
  data: MembershipEdit,
) {
  const edit = membershipEdit(data);
  if (Object.keys(edit).length === 0) return;
  await db.membership.updateMany({ where: { userId, year }, data: edit });
}

export interface MembershipYearPayment {
  paidAmount: number | null;
  paymentMethod: string | null;
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
  const paidAmount = payment.paidAmount === null ? null : splitPayment(payment.paidAmount, fee).fee;

  await db.membership.upsert({
    where: { userId_year: { userId, year } },
    update: {},
    create: {
      memberId: await memberOf(db, userId),
      userId,
      year,
      status: "ACTIVE",
      paidAmount,
      paymentMethod: payment.paymentMethod,
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

export interface MembershipSnapshot {
  status: ReviewStatus;
  rejectionReason: string | null;
  paidAmount: number | null;
  paymentMethod: string | null;
  paymentProof: string | null;
  referenceCode: string | null;
  surplusAnonymous: boolean;
}

export async function saveMembershipSnapshot(
  db: Db,
  userId: string,
  year: number,
  snapshot: MembershipSnapshot,
) {
  await db.membership.upsert({
    where: { userId_year: { userId, year } },
    update: snapshot,
    create: { memberId: await memberOf(db, userId), userId, year, ...snapshot },
  });
}
