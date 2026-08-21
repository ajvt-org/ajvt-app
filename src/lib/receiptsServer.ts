import { prisma } from "./prisma";
import type { ReceiptPurpose, ReceiptRow } from "./receipts";

export async function receiptsForMember(where: { userId?: string; memberId?: string }) {
  const payments = await prisma.payment.findMany({
    where: {
      status: "ACTIVE",
      member: where.memberId ? { id: where.memberId } : { userId: where.userId },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      purpose: true,
      year: true,
      createdAt: true,
      activity: { select: { title: true } },
      member: { select: { fullName: true, memberNumber: true } },
    },
  });

  return payments.map<ReceiptRow>((p) => ({
    id: p.id,
    amount: p.amount,
    purpose: p.purpose as ReceiptPurpose,
    paidAt: p.createdAt.toISOString(),
    year: p.year,
    memberNumber: p.member?.memberNumber ?? null,
    payerName: p.member?.fullName ?? "",
    activityTitle: p.activity?.title ?? null,
  }));
}
