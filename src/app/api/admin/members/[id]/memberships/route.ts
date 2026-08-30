import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { getAppSettings } from "@/lib/settingsServer";
import { renewalRefusal } from "@/lib/renewal";
import { currentMembership } from "@/lib/currentMembershipServer";
import { NotFoundError } from "@/lib/errors";
import { members as messages } from "@/lib/messages";
import { paidForYear } from "@/lib/paidBreakdown";

export const GET = withRoute(
  "GET /api/admin/members/[id]/memberships",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { membershipYear } = await getAppSettings();

    const current = await currentMembership(prisma, id);
    if (!current) throw new NotFoundError(messages.notFound);
    const account = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: { memberNumber: true },
    });

    const memberships = await prisma.membership.findMany({
      where: { userId: id },
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
      where: { userId: id, purpose: "MEMBERSHIP" },
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
          status: current.status,
          membershipYear: current.year,
          memberNumber: account.memberNumber,
        },
        membershipYear,
      ),
    });
  },
);
