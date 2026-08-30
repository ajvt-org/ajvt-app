import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUnscopedAdmin } from "@/lib/activityAccessServer";
import { proofScope } from "@/lib/proofScope";
import { withRoute } from "@/lib/route";
import { nameOf } from "@/lib/person";
import { donorNameOnRecord } from "@/lib/donorName";

export const GET = withRoute("GET /api/admin/payment-proofs", async () => {
  const session = await requireUnscopedAdmin();
  const scope = proofScope((session as { role: string }).role);
  const includeMembership = scope.membership;
  const includeActivity = scope.activity;
  const includeDonations = scope.donations;

  const [members, registrations, donations] = await Promise.all([
    includeMembership
      ? prisma.member.findMany({
          where: { paymentProof: { not: null } },
          select: {
            id: true,
            user: { select: { fullName: true } },
            paymentProof: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    includeActivity
      ? prisma.activityRegistration.findMany({
          where: { paymentProof: { not: null } },
          select: {
            id: true,
            paymentProof: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            user: { select: { fullName: true } },
            activity: { select: { title: true } },
          },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    includeDonations
      ? prisma.donation.findMany({
          where: { source: { not: "MEMBERSHIP" } },
          select: {
            id: true,
            anonymous: true,
            donorName: true,
            donorPhone: true,
            donorPhoto: true,
            amount: true,
            proof: true,
            status: true,
            source: true,
            paymentMethod: true,
            userId: true,
            activityId: true,
            activity: { select: { title: true } },
            user: { select: { fullName: true } },
            tags: { select: { id: true, name: true } },
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const receipts = await prisma.receipt.findMany({
    where: { paymentId: { in: donations.map((d) => d.id) } },
    select: { paymentId: true, number: true, status: true, token: true },
  });
  const receiptOf = new Map(receipts.map((r) => [r.paymentId, r]));

  const proofs = [
    ...members.map((m) => ({
      id: m.id,
      kind: "MEMBERSHIP" as const,
      proof: m.paymentProof as string,
      memberName: nameOf(m.user),
      activityTitle: null as string | null,
      amount: null as number | null,
      status: m.status,
      uploadedAt: m.updatedAt,
      submittedAt: m.createdAt,
    })),
    ...registrations.map((r) => ({
      id: r.id,
      kind: "ACTIVITY" as const,
      proof: r.paymentProof as string,
      memberName: nameOf(r.user),
      activityTitle: r.activity.title,
      amount: null as number | null,
      status: r.status,
      uploadedAt: r.updatedAt,
      submittedAt: r.createdAt,
    })),
    ...donations.map((d) => ({
      id: d.id,
      kind: "DONATION" as const,
      proof: d.proof as string | null,
      memberName: donorNameOnRecord(d),
      activityId: d.activityId,
      activityTitle: d.activity?.title ?? null,
      amount: d.amount,
      status: d.status,
      source: d.source,
      paymentMethod: d.paymentMethod,
      userId: d.userId,
      anonymous: d.anonymous,
      donorName: d.donorName,
      donorPhone: d.donorPhone,
      donorPhoto: d.donorPhoto,
      tags: d.tags,
      receipt: receiptOf.get(d.id) ?? null,
      uploadedAt: d.updatedAt,
      submittedAt: d.createdAt,
    })),
  ].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

  return NextResponse.json({ proofs });
});
