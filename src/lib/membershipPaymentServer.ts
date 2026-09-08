import type { Prisma, PrismaClient, ReviewStatus } from "@prisma/client";
import { isPaidAmount } from "./paymentMirror";
import {
  ensureReceiptsFor,
  syncReceiptsFor,
  withdrawReceiptsBeforeDelete,
} from "./paymentReceiptServer";
import type { MembershipVerdict } from "./membershipVerdict";
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

  const made = await db.payment.create({
    data: {
      ...columns,
      purpose: "MEMBERSHIP",
      userId,
      year,
      amount: total,
      feeApplied: fee,
      anonymous: choice ?? false,
    },
  });
  await ensureReceiptsFor(db, { id: made.id });
}

export async function recordFeeVerdict(
  db: Db,
  userId: string,
  year: number,
  verdict: MembershipVerdict,
  now: Date,
) {
  await db.payment.updateMany({
    where: { userId, year, purpose: "MEMBERSHIP" },
    data: {
      status: verdict.status,
      ...(verdict.reviewedBy ? { reviewedBy: verdict.reviewedBy, reviewedAt: now } : {}),
    },
  });
  await syncReceiptsFor(db, { userId, year, purpose: "MEMBERSHIP" });
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

export async function setSurplusVisibility(db: Db, userId: string, anonymous: boolean) {
  const membership = await currentMembership(db, userId);
  if (!membership) return;

  await db.payment.updateMany({
    where: { userId, year: membership.year, purpose: "MEMBERSHIP" },
    data: { anonymous },
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
