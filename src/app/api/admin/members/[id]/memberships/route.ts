import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { getAppSettings } from "@/lib/settingsServer";
import { renewalRefusal } from "@/lib/renewal";
import { membershipForMember } from "@/lib/currentMembershipServer";
import { NotFoundError } from "@/lib/errors";
import { members as messages } from "@/lib/messages";
import { paidForYear } from "@/lib/paidBreakdown";

export const GET = withRoute(
  "GET /api/admin/members/[id]/memberships",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { membershipYear } = await getAppSettings();

    const member = await membershipForMember(prisma, id);
    if (!member) throw new NotFoundError(messages.notFound);
    const account = await prisma.user.findUniqueOrThrow({
      where: { id: member.userId },
      select: { memberNumber: true },
    });

    const memberships = await prisma.membership.findMany({
      where: { userId: member.userId },
      orderBy: { year: "desc" },
      select: {
        id: true,
        year: true,
        status: true,
        rejectionReason: true,
        paymentMethod: true,
        recordedBy: true,
        createdAt: true,
      },
    });

    const payments = await prisma.payment.findMany({
      where: { userId: member.userId, purpose: "MEMBERSHIP" },
      select: { amount: true, feeApplied: true, year: true },
    });

    return NextResponse.json({
      memberships: memberships.map((m) => {
        const paid = paidForYear(payments, m.year);
        return { ...m, paidAmount: paid?.fee ?? null, supportAmount: paid?.support ?? 0 };
      }),
      currentYear: membershipYear,
      refusal: renewalRefusal(
        {
          status: member.membership.status,
          membershipYear: member.membership.year,
          memberNumber: account.memberNumber,
        },
        membershipYear,
      ),
    });
  },
);
