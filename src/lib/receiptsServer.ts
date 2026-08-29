import { prisma } from "./prisma";
import type { ReceiptPurpose, ReceiptRow } from "./receipts";
import { nameOf } from "./person";

export async function receiptsForMember(where: { userId: string } | { memberId: string }) {
  const payments = await prisma.payment.findMany({
    where: {
      status: "ACTIVE",
      member: "memberId" in where ? { id: where.memberId } : { userId: where.userId },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      purpose: true,
      year: true,
      createdAt: true,
      activity: { select: { title: true } },
      member: { select: { user: { select: { fullName: true, memberNumber: true } } } },
    },
  });

  return payments.map<ReceiptRow>((p) => ({
    id: p.id,
    amount: p.amount,
    purpose: p.purpose as ReceiptPurpose,
    paidAt: p.createdAt.toISOString(),
    year: p.year,
    memberNumber: p.member?.user.memberNumber ?? null,
    payerName: nameOf(p.member?.user ?? { fullName: null }),
    activityTitle: p.activity?.title ?? null,
  }));
}
