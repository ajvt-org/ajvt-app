import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { getAppSettings } from "@/lib/settingsServer";
import { recordMembershipPayment } from "@/lib/membershipPaymentServer";
import { validatePaidAmount } from "@/lib/donations";
import { renewalRefusal, type RenewalRefusal } from "@/lib/renewal";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { members as messages } from "@/lib/messages";
import { renewSchema } from "./schema";
import { stampRecordedBy } from "@/lib/paymentMirror";
import { nameOf } from "@/lib/person";

const REFUSALS: Record<NonNullable<RenewalRefusal>, string> = {
  notActive: messages.renewNotActive,
  notIssued: messages.renewNotIssued,
  alreadyRenewed: messages.renewAlreadyDone,
  yearBehind: messages.renewYearBehind,
};

export const POST = withRoute(
  "POST /api/admin/members/[id]/renew",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { paidAmount, paymentMethod, paymentProof } = parse(renewSchema, await req.json());
    const { membershipFee, membershipYear } = await getAppSettings();

    const paidAmountError = validatePaidAmount(paidAmount, membershipFee);
    if (paidAmountError) throw new ValidationError(paidAmountError);

    const member = await prisma.member.findUnique({
      where: { id },
      include: { user: { select: { fullName: true, memberNumber: true } } },
    });
    if (!member) throw new NotFoundError(messages.notFound);

    const refusal = renewalRefusal(
      { ...member, memberNumber: member.user.memberNumber },
      membershipYear,
    );
    if (refusal) throw new ConflictError(REFUSALS[refusal]);

    const renewed = await prisma.$transaction(async (tx) => {
      await tx.membership.create({
        data: {
          memberId: id,
          userId: member.userId,
          year: membershipYear,
          status: "ACTIVE",
          paidAmount: Math.min(Number(paidAmount), membershipFee),
          paymentMethod,
          paymentProof: paymentProof || null,
          recordedBy: session.username,
          reviewedBy: session.username,
          reviewedAt: new Date(),
        },
      });
      await tx.member.update({
        where: { id },
        data: {
          membershipYear,
          paymentMethod,
          paymentProof: paymentProof || member.paymentProof,
        },
      });
      await recordMembershipPayment(tx, id, Number(paidAmount), membershipFee);
      await stampRecordedBy(tx, member.userId, membershipYear, session.username);
      return tx.member.findUniqueOrThrow({ where: { id } });
    });

    await logAction(
      session.username,
      "RENEW_MEMBER",
      `${nameOf(member.user)} — ${membershipYear}`,
      {
        ...auditContext(session, req),
        targetType: "Member",
        targetId: id,
        before: { membershipYear: member.membershipYear, paidAmount: member.paidAmount },
        after: { membershipYear, paidAmount: Number(paidAmount) },
      },
    );

    return NextResponse.json({ member: renewed }, { status: 201 });
  },
);
