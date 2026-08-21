import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import type { ReceiptPurpose, ReceiptRow } from "@/lib/receipts";

export const GET = withRoute("GET /api/user/receipts", async () => {
  const session = await requireUser();

  const payments = await prisma.payment.findMany({
    where: { status: "ACTIVE", member: { userId: session.userId } },
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

  const receipts: ReceiptRow[] = payments.map((p) => ({
    id: p.id,
    amount: p.amount,
    purpose: p.purpose as ReceiptPurpose,
    paidAt: p.createdAt.toISOString(),
    year: p.year,
    memberNumber: p.member?.memberNumber ?? null,
    payerName: p.member?.fullName ?? "",
    activityTitle: p.activity?.title ?? null,
  }));

  return NextResponse.json({ receipts });
});
