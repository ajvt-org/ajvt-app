import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAdmin();
    const role = (session as { role: string }).role;
    const includeMembership = role === "SUPER" || role === "MEMBERS";
    const includeActivity = role === "SUPER" || role === "ACTIVITIES";

    const [members, registrations] = await Promise.all([
      includeMembership
        ? prisma.member.findMany({
            where: { paymentProof: { not: null } },
            select: { id: true, fullName: true, paymentProof: true, status: true, createdAt: true, updatedAt: true },
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
    ]);

    const proofs = [
      ...members.map((m) => ({
        id: m.id,
        kind: "MEMBERSHIP" as const,
        proof: m.paymentProof as string,
        memberName: m.fullName,
        activityTitle: null as string | null,
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
        status: r.status,
        uploadedAt: r.updatedAt,
        submittedAt: r.createdAt,
      })),
    ].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

    return NextResponse.json({ proofs });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Payment proofs fetch error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
