import type { Prisma, PrismaClient, Receipt } from "@prisma/client";
import { receiptNumber } from "./officialReceipt";
import { receiptTitle, type ReceiptPurpose } from "./receipts";
import { generateVerifyToken } from "./verifyToken";
import { publicDonorName } from "./donorName";
import { receipts as receiptMessages } from "./messages";
import { SETTINGS_ID } from "./settings";

type Db = PrismaClient | Prisma.TransactionClient;

const ISSUED_BY = "system";

const SELECT = {
  id: true,
  amount: true,
  purpose: true,
  year: true,
  createdAt: true,
  anonymous: true,
  donorName: true,
  memberId: true,
  userId: true,
  activity: { select: { title: true } },
  user: { select: { fullName: true } },
} as const;

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof SELECT }>;

function payerOf(payment: PaymentRow): string {
  return publicDonorName(payment);
}

function reasonOf(payment: PaymentRow): string {
  return receiptTitle({
    purpose: payment.purpose as ReceiptPurpose,
    year: payment.year,
    activityTitle: payment.activity?.title ?? null,
  });
}

async function nextNumber(db: Db, year: number): Promise<string> {
  const counter = await db.counter.upsert({
    where: { id: `receipt:${year}` },
    update: { value: { increment: 1 } },
    create: { id: `receipt:${year}`, value: 1 },
  });
  return receiptNumber(year, counter.value);
}

export async function ensureReceiptsFor(
  db: Db,
  where: Prisma.PaymentWhereInput,
): Promise<Receipt[]> {
  const payments = await db.payment.findMany({
    where: { ...where, status: "ACTIVE", receipt: { is: null } },
    orderBy: { createdAt: "asc" },
    select: SELECT,
  });
  if (payments.length === 0) return [];

  const settings = await db.appSettings.findUnique({ where: { id: SETTINGS_ID } });
  const issued: Receipt[] = [];

  for (const payment of payments) {
    const year = payment.createdAt.getFullYear();
    issued.push(
      await db.receipt.create({
        data: {
          number: await nextNumber(db, year),
          token: generateVerifyToken(),
          payerName: payerOf(payment),
          reason: reasonOf(payment),
          amount: payment.amount,
          issuedOn: payment.createdAt,
          issuedBy: ISSUED_BY,
          secretary: settings?.secretaryName ?? null,
          treasurer: settings?.treasurerName ?? null,
          memberId: payment.memberId,
          userId: payment.userId,
          paymentId: payment.id,
        },
      }),
    );
  }
  return issued;
}

export async function withdrawReceiptsFor(
  db: Db,
  where: Prisma.PaymentWhereInput,
): Promise<number> {
  const stale = await db.receipt.findMany({
    where: {
      status: "ACTIVE",
      payment: { is: { ...where, status: { not: "ACTIVE" } } },
    },
    select: { id: true },
  });
  if (stale.length === 0) return 0;

  const { count } = await db.receipt.updateMany({
    where: { id: { in: stale.map((r) => r.id) } },
    data: {
      status: "VOID",
      voidReason: receiptMessages.withdrawnOnRefusal,
      voidedBy: ISSUED_BY,
      voidedAt: new Date(),
    },
  });
  return count;
}

const STANDING_SELECT = {
  id: true,
  number: true,
  amount: true,
  payerName: true,
  reason: true,
  memberId: true,
  userId: true,
  payment: { select: SELECT },
} as const;

type StandingReceipt = Prisma.ReceiptGetPayload<{ select: typeof STANDING_SELECT }>;

export type ReceiptChange = {
  field: "amount" | "payerName" | "reason" | "memberId" | "userId";
  from: string | number | null;
  to: string | number | null;
};

export interface ReceiptDrift {
  receiptId: string;
  number: string;
  paymentId: string;
  action: "reissue" | "correct";
  changes: ReceiptChange[];
}

function driftOf(receipt: StandingReceipt, payment: PaymentRow): ReceiptDrift | null {
  const wanted: ReceiptChange[] = [
    { field: "amount", from: receipt.amount, to: payment.amount },
    { field: "payerName", from: receipt.payerName, to: payerOf(payment) },
    { field: "reason", from: receipt.reason, to: reasonOf(payment) },
    { field: "memberId", from: receipt.memberId, to: payment.memberId },
    { field: "userId", from: receipt.userId, to: payment.userId },
  ];
  const changes = wanted.filter((c) => c.from !== c.to);
  if (changes.length === 0) return null;

  return {
    receiptId: receipt.id,
    number: receipt.number,
    paymentId: payment.id,
    action: changes.some((c) => c.field === "amount") ? "reissue" : "correct",
    changes,
  };
}

export async function receiptDriftFor(
  db: Db,
  where: Prisma.PaymentWhereInput,
): Promise<ReceiptDrift[]> {
  const standing = await db.receipt.findMany({
    where: { status: "ACTIVE", payment: { is: { ...where, status: "ACTIVE" } } },
    orderBy: { number: "asc" },
    select: STANDING_SELECT,
  });

  const drifted: ReceiptDrift[] = [];
  for (const receipt of standing) {
    if (!receipt.payment) continue;
    const drift = driftOf(receipt, receipt.payment);
    if (drift) drifted.push(drift);
  }
  return drifted;
}

export async function reconcileReceiptsFor(db: Db, where: Prisma.PaymentWhereInput) {
  const drifted = await receiptDriftFor(db, where);
  const detached: ReceiptDrift[] = [];

  for (const drift of drifted) {
    if (drift.action === "reissue") {
      await db.receipt.update({
        where: { id: drift.receiptId },
        data: {
          status: "VOID",
          voidReason: receiptMessages.correctedPending,
          voidedBy: ISSUED_BY,
          voidedAt: new Date(),
          paymentId: null,
        },
      });
      detached.push(drift);
      continue;
    }
    await db.receipt.update({
      where: { id: drift.receiptId },
      data: Object.fromEntries(drift.changes.map((c) => [c.field, c.to])),
    });
  }

  return detached;
}

export async function syncReceiptsFor(db: Db, where: Prisma.PaymentWhereInput) {
  await withdrawReceiptsFor(db, where);
  const detached = await reconcileReceiptsFor(db, where);
  const issued = await ensureReceiptsFor(db, where);

  for (const drift of detached) {
    const replacement = issued.find((r) => r.paymentId === drift.paymentId);
    if (!replacement) continue;
    await db.receipt.update({
      where: { id: drift.receiptId },
      data: { voidReason: receiptMessages.replacedAfterCorrection(replacement.number) },
    });
  }

  return issued;
}
