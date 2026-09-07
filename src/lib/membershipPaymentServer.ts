import type { Prisma, PrismaClient, ReviewStatus } from "@prisma/client";
import { isPaidAmount, mirrorMembershipStatus } from "./paymentMirror";
import {
  ensureReceiptsFor,
  syncReceiptsFor,
  withdrawReceiptsBeforeDelete,
} from "./paymentReceiptServer";
import { setMembershipStatus } from "./membershipRecord";
import { currentMembership } from "./currentMembershipServer";

type Db = PrismaClient | Prisma.TransactionClient;

export interface MembershipFee {
  method?: string | null;
  accountId?: string | null;
  bankReference?: string | null;
  proof?: string | null;
  referenceCode?: string | null;
  status?: ReviewStatus;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  recordedBy?: string | null;
  anonymous?: boolean;
}

export async function writeMembershipFee(
  db: Db,
  userId: string,
  year: number,
  total: number | null,
  fee: number,
  fields: MembershipFee = {},
) {
  const standing = await db.payment.findFirst({
    where: { userId, year, purpose: "MEMBERSHIP" },
    select: { id: true },
  });

  if (!isPaidAmount(total)) {
    if (standing) {
      await withdrawReceiptsBeforeDelete(db, { id: standing.id });
      await db.payment.delete({ where: { id: standing.id } });
    }
    return;
  }

  const { anonymous: choice, ...columns } = fields;

  if (standing) {
    await db.payment.update({
      where: { id: standing.id },
      data: { ...columns, amount: total, feeApplied: fee },
    });
    await syncReceiptsFor(db, { id: standing.id });
    return;
  }

  const anonymous = choice ?? false;
  const account = anonymous
    ? null
    : await db.user.findUnique({ where: { id: userId }, select: { fullName: true } });

  const made = await db.payment.create({
    data: {
      ...columns,
      purpose: "MEMBERSHIP",
      userId,
      year,
      amount: total,
      feeApplied: fee,
      anonymous,
      donorName: account?.fullName ?? null,
    },
  });
  await ensureReceiptsFor(db, { id: made.id });
}

export async function recordMembershipPayment(
  db: Db,
  userId: string,
  total: number | null,
  fee: number,
  fields: MembershipFee = {},
) {
  const membership = await currentMembership(db, userId);
  if (!membership) return;
  await writeMembershipFee(db, userId, membership.year, total, fee, fields);
}

export async function syncSurplusStatus(db: Db, userId: string, reviewedBy?: string) {
  const membership = await currentMembership(db, userId);
  if (!membership) return;

  const verdict = {
    status: membership.status,
    rejectionReason: membership.rejectionReason,
    reviewedBy: reviewedBy ?? null,
  };
  const now = new Date();
  await mirrorMembershipStatus(db, userId, membership.year, verdict, now);
  await setMembershipStatus(db, userId, membership.year, verdict, now);
}

export async function setSurplusVisibility(db: Db, userId: string, anonymous: boolean) {
  const membership = await currentMembership(db, userId);
  if (!membership) return;

  const account = await db.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });

  await db.payment.updateMany({
    where: { userId, year: membership.year, purpose: "MEMBERSHIP" },
    data: { anonymous, donorName: anonymous ? null : (account?.fullName ?? null) },
  });
}

export async function totalPaidFor(db: Db, userId: string): Promise<number | null> {
  const membership = await currentMembership(db, userId);
  if (!membership) return null;

  const payment = await db.payment.findFirst({
    where: { userId, purpose: "MEMBERSHIP", year: membership.year },
    select: { amount: true },
  });
  return payment?.amount ?? null;
}
