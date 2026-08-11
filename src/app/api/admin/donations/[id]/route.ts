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
    const { status } = await req.json();

    if (!["ACTIVE", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const existing = await prisma.donation.findUnique({ where: { id }, select: { source: true, donorName: true } });
    if (!existing) {
      return NextResponse.json({ error: "التبرع غير موجود" }, { status: 404 });
    }
    if (existing.source === "MEMBERSHIP") {
      return NextResponse.json({ error: "هذا التبرع مُدار تلقائياً ولا يمكن تعديله يدوياً" }, { status: 400 });
    }

    const donation = await prisma.donation.update({ where: { id }, data: { status } });
    await logAction(session.username, status === "ACTIVE" ? "APPROVE_DONATION" : "REJECT_DONATION", existing.donorName || "فاعل خير");

    return NextResponse.json({ donation });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Donation validate error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
