import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Donations are only visible to SUPER admins today (see payment-proofs'
    // includeDonations gate) — validation follows the same scope.
    const session = await requireAdminRole("SUPER");
    const { id } = await params;
    const { status, memberId } = await req.json();

    if (status === undefined && memberId === undefined) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    if (status !== undefined && !["ACTIVE", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    if (memberId !== undefined && memberId !== null && typeof memberId !== "string") {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const existing = await prisma.donation.findUnique({ where: { id }, select: { source: true, donorName: true } });
    if (!existing) {
      return NextResponse.json({ error: "التبرع غير موجود" }, { status: 404 });
    }
    // MEMBERSHIP-source rows are derived from Member.paidAmount/status and
    // kept in sync automatically — manual edits here would be silently
    // overwritten (or resurrected) the next time that sync runs.
    if (existing.source === "MEMBERSHIP") {
      return NextResponse.json({ error: "هذا التبرع مُدار تلقائياً ولا يمكن تعديله يدوياً" }, { status: 400 });
    }

    const data: { status?: string; memberId?: string | null } = {};
    if (status !== undefined) data.status = status;

    if (memberId !== undefined) {
      if (memberId !== null) {
        const member = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true } });
        if (!member) return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
      }
      data.memberId = memberId;
    }

    const donation = await prisma.donation.update({
      where: { id },
      data,
      include: { member: { select: { fullName: true } } },
    });

    if (status !== undefined) {
      await logAction(session.username, status === "ACTIVE" ? "APPROVE_DONATION" : "REJECT_DONATION", donation.member?.fullName || existing.donorName || "فاعل خير");
    }
    if (memberId !== undefined) {
      await logAction(
        session.username,
        memberId ? "LINK_DONATION_MEMBER" : "UNLINK_DONATION_MEMBER",
        memberId ? `${existing.donorName || "فاعل خير"} → ${donation.member?.fullName}` : (existing.donorName || "فاعل خير")
      );
    }

    return NextResponse.json({ donation });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Donation update error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
