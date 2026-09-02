import { prisma } from "./prisma";
import { generateVerifyToken } from "./verifyToken";
import { getAppSettings } from "./settingsServer";
import { receiptNumber, type OfficialReceiptView, type ReceiptState } from "./officialReceipt";
import {
  CONFIDENTIAL_SELECT,
  nameIsConfidential,
  seesPaymentIdentity,
  withoutFields,
  type SupportViewer,
} from "./supportPrivacy";
import { money } from "./messages";
import type { Prisma, Receipt } from "@prisma/client";

export interface ReceiptDraft {
  payerName: string;
  reason: string;
  amount: number;
  issuedOn: Date;
  issuedBy: string;
  userId?: string | null;
  paymentId?: string | null;
}

export async function nextReceiptNumber(year: number): Promise<string> {
  const counter = await prisma.counter.upsert({
    where: { id: `receipt:${year}` },
    update: { value: { increment: 1 } },
    create: { id: `receipt:${year}`, value: 1 },
  });
  return receiptNumber(year, counter.value);
}

export async function issueReceipt(draft: ReceiptDraft): Promise<Receipt> {
  const settings = await getAppSettings();
  return prisma.receipt.create({
    data: {
      number: await nextReceiptNumber(draft.issuedOn.getFullYear()),
      token: generateVerifyToken(),
      payerName: draft.payerName,
      reason: draft.reason,
      amount: draft.amount,
      issuedOn: draft.issuedOn,
      issuedBy: draft.issuedBy,
      secretary: settings.secretaryName,
      treasurer: settings.treasurerName,
      userId: draft.userId ?? null,
      paymentId: draft.paymentId ?? null,
    },
  });
}

export async function issueReceiptForPayment(
  paymentId: string,
  draft: Omit<ReceiptDraft, "paymentId">,
): Promise<Receipt> {
  const existing = await prisma.receipt.findUnique({ where: { paymentId } });
  if (existing) return existing;
  try {
    return await issueReceipt({ ...draft, paymentId });
  } catch (err) {
    if ((err as Prisma.PrismaClientKnownRequestError).code !== "P2002") throw err;
    return prisma.receipt.findUniqueOrThrow({ where: { paymentId } });
  }
}

export async function voidReceipt(
  number: string,
  reason: string,
  by: string,
): Promise<Receipt | null> {
  const existing = await prisma.receipt.findUnique({ where: { number } });
  if (!existing || existing.status === "VOID") return null;
  return prisma.receipt.update({
    where: { number },
    data: { status: "VOID", voidReason: reason, voidedBy: by, voidedAt: new Date() },
  });
}

export async function receiptByToken(token: string): Promise<OfficialReceiptView | null> {
  const row = await prisma.receipt.findUnique({ where: { token } });
  return row ? receiptView(row) : null;
}

const VIEW_SELECT = {
  number: true,
  token: true,
  payerName: true,
  reason: true,
  amount: true,
  issuedOn: true,
  secretary: true,
  treasurer: true,
  status: true,
} as const;

const PAYER_SELECT = {
  userId: true,
  user: { select: CONFIDENTIAL_SELECT },
  payment: {
    select: {
      purpose: true,
      amount: true,
      feeApplied: true,
      userId: true,
      user: { select: CONFIDENTIAL_SELECT },
    },
  },
} as const;

const LISTED_SELECT = { ...VIEW_SELECT, ...PAYER_SELECT } as const;

type PayerRow = Prisma.ReceiptGetPayload<{ select: typeof PAYER_SELECT }>;

function namesThePayer(row: PayerRow, viewer: SupportViewer): boolean {
  if (row.payment) return seesPaymentIdentity(viewer, row.payment);
  return !nameIsConfidential({ userId: row.userId, user: row.user });
}

export async function receiptNamesPayer(
  number: string,
  viewer: SupportViewer,
): Promise<boolean | null> {
  const row = await prisma.receipt.findUnique({ where: { number }, select: PAYER_SELECT });
  return row ? namesThePayer(row, viewer) : null;
}

export function receiptViewFor(row: ReceiptViewRow, named: boolean): OfficialReceiptView {
  const view = receiptView(row);
  return named ? view : { ...withoutFields(view, ["token"]), payerName: money.anonymousDonor };
}

type ReceiptViewRow = Prisma.ReceiptGetPayload<{ select: typeof VIEW_SELECT }>;

export async function receiptYears(): Promise<number[]> {
  const rows = await prisma.receipt.findMany({
    select: { issuedOn: true },
    orderBy: { issuedOn: "desc" },
    distinct: ["issuedOn"],
  });
  return [...new Set(rows.map((r) => r.issuedOn.getFullYear()))].sort((a, b) => b - a);
}

export async function listReceipts(
  viewer: SupportViewer,
  year?: number,
): Promise<OfficialReceiptView[]> {
  const rows = await prisma.receipt.findMany({
    where: year
      ? { issuedOn: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } }
      : undefined,
    orderBy: { issuedOn: "desc" },
    select: LISTED_SELECT,
  });
  return rows.map((row) => receiptViewFor(row, namesThePayer(row, viewer)));
}

export function receiptView(row: ReceiptViewRow): OfficialReceiptView {
  return {
    number: row.number,
    token: row.token,
    payerName: row.payerName,
    reason: row.reason,
    amount: row.amount,
    issuedOn: row.issuedOn.toISOString(),
    secretary: row.secretary,
    treasurer: row.treasurer,
    status: row.status as ReceiptState,
  };
}
