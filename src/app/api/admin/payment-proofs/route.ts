import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { money } from "@/lib/messages";

export const GET = withRoute("GET /api/admin/payment-proofs", async () => {
  const session = await requireAdmin();
  const role = (session as { role: string }).role;
  const includeMembership = role === "SUPER" || role === "MEMBERS";
  const includeActivity = role === "SUPER" || role === "ACTIVITIES";
  const includeDonations = role === "SUPER";

  const [members, registrations, donations] = await Promise.all([
    includeMembership
      ? prisma.member.findMany({
          where: { paymentProof: { not: null } },
          select: {
            id: true,
            fullName: true,
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
            member: { select: { fullName: true } },
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
            donorName: true,
            donorPhone: true,
            donorPhoto: true,
            amount: true,
            proof: true,
            status: true,
            source: true,
            paymentMethod: true,
            memberId: true,
            member: { select: { fullName: true } },
            tags: { select: { id: true, name: true } },
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const proofs = [
    ...members.map((m) => ({
      id: m.id,
      kind: "MEMBERSHIP" as const,
      proof: m.paymentProof as string,
      memberName: m.fullName,
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
      memberName: r.member.fullName,
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
      memberName: d.member?.fullName || d.donorName || money.anonymousDonor,
      activityTitle: null as string | null,
      amount: d.amount,
      status: d.status,
      source: d.source,
      paymentMethod: d.paymentMethod,
      memberId: d.memberId,
      donorName: d.donorName,
      donorPhone: d.donorPhone,
      donorPhoto: d.donorPhoto,
      tags: d.tags,
      uploadedAt: d.updatedAt,
      submittedAt: d.createdAt,
    })),
  ].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

  return NextResponse.json({ proofs });
});
