import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { getAppSettings } from "@/lib/settingsServer";
import { renewalRefusal } from "@/lib/renewal";
import { currentMembership } from "@/lib/currentMembershipServer";
import { NotFoundError } from "@/lib/errors";
import { members as messages } from "@/lib/messages";
import { feeOnly, paidForYear } from "@/lib/paidBreakdown";
import { CONFIDENTIAL_SELECT, seesSupporterName } from "@/lib/supportPrivacy";
import { viewerOf } from "@/lib/supportViewer";

export const GET = withRoute(
  "GET /api/admin/members/[id]/memberships",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { membershipYear } = await getAppSettings();

    const current = await currentMembership(prisma, id);
    if (!current) throw new NotFoundError(messages.notFound);
    const account = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: { memberNumber: true, ...CONFIDENTIAL_SELECT },
    });
    const named = seesSupporterName(viewerOf(session), { userId: id, user: account });

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
        const banked = paidForYear(payments, m.year);
        const paid = named ? banked : feeOnly(banked);
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
