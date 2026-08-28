import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { getAppSettings } from "@/lib/settingsServer";
import { renewalRefusal } from "@/lib/renewal";
import { NotFoundError } from "@/lib/errors";
import { members as messages } from "@/lib/messages";
import { paidForYear } from "@/lib/paidBreakdown";

export const GET = withRoute(
  "GET /api/admin/members/[id]/memberships",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { membershipYear } = await getAppSettings();

    const member = await prisma.member.findUnique({
      where: { id },
      select: { status: true, membershipYear: true, memberNumber: true },
    });
    if (!member) throw new NotFoundError(messages.notFound);

    const memberships = await prisma.membership.findMany({
      where: { memberId: id },
      orderBy: { year: "desc" },
      select: {
        id: true,
        year: true,
        status: true,
        rejectionReason: true,
        paidAmount: true,
        paymentMethod: true,
        recordedBy: true,
        createdAt: true,
      },
    });

    const payments = await prisma.payment.findMany({
      where: { memberId: id, purpose: "MEMBERSHIP" },
      select: { amount: true, feeApplied: true, year: true },
    });

    return NextResponse.json({
      memberships: memberships.map((m) => {
        const paid = paidForYear(payments, m.year);
        return { ...m, paidAmount: paid?.fee ?? null, supportAmount: paid?.support ?? 0 };
      }),
      currentYear: membershipYear,
      refusal: renewalRefusal(member, membershipYear),
    });
  },
);
