import type { Prisma, PrismaClient, ReviewStatus } from "@prisma/client";
import { splitPayment } from "./membershipPayment";
import { stampRecordedBy } from "./paymentMirror";

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
  memberId: string,
  year: number,
  data: MembershipEdit,
) {
  const edit = membershipEdit(data);
  if (Object.keys(edit).length === 0) return;
  await db.membership.updateMany({ where: { memberId, year }, data: edit });
}

export interface MembershipYearPayment {
  paidAmount: number | null;
  paymentMethod: string | null;
  paymentProof: string | null;
  recordedBy?: string | null;
}

export async function recordMembershipYear(
  db: Db,
  memberId: string,
  year: number,
  fee: number,
  payment: MembershipYearPayment,
) {
  const paidAmount = payment.paidAmount === null ? null : splitPayment(payment.paidAmount, fee).fee;

  await db.membership.upsert({
    where: { memberId_year: { memberId, year } },
    update: {},
    create: {
      memberId,
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
      where: { memberId, year, recordedBy: null },
      data: { recordedBy: payment.recordedBy },
    });
    await stampRecordedBy(db, memberId, year, payment.recordedBy);
  }
}

export interface MembershipVerdict {
  status: ReviewStatus;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
}

export async function setMembershipStatus(
  db: Db,
  memberId: string,
  year: number,
  verdict: MembershipVerdict,
  now: Date,
) {
  await db.membership.updateMany({
    where: { memberId, year },
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
  memberId: string,
  year: number,
  snapshot: MembershipSnapshot,
) {
  await db.membership.upsert({
    where: { memberId_year: { memberId, year } },
    update: snapshot,
    create: { memberId, year, ...snapshot },
  });
}
