import type { Prisma, PrismaClient, Receipt } from "@prisma/client";
import { receiptNumber } from "./officialReceipt";
import { receiptTitle, type ReceiptPurpose } from "./receipts";
import { generateVerifyToken } from "./verifyToken";
import { nameOf } from "./person";
import { money, receipts as receiptMessages } from "./messages";
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
  activity: { select: { title: true } },
  member: { select: { user: { select: { fullName: true } } } },
} as const;

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof SELECT }>;

function payerOf(payment: PaymentRow): string {
  if (payment.anonymous) return money.anonymousDonor;
  if (payment.member) return nameOf(payment.member.user);
  return payment.donorName?.trim() || money.anonymousDonor;
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
          reason: receiptTitle({
            purpose: payment.purpose as ReceiptPurpose,
            year: payment.year,
            activityTitle: payment.activity?.title ?? null,
          }),
          amount: payment.amount,
          issuedOn: payment.createdAt,
          issuedBy: ISSUED_BY,
          secretary: settings?.secretaryName ?? null,
          treasurer: settings?.treasurerName ?? null,
          memberId: payment.memberId,
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

export async function syncReceiptsFor(db: Db, where: Prisma.PaymentWhereInput) {
  await withdrawReceiptsFor(db, where);
  return ensureReceiptsFor(db, where);
}
