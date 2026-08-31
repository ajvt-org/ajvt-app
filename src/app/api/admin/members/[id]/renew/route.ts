import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { getAppSettings } from "@/lib/settingsServer";
import { recordMembershipPayment, totalPaidFor } from "@/lib/membershipPaymentServer";
import { validatePaidAmount } from "@/lib/donations";
import { renewalRefusal, type RenewalRefusal } from "@/lib/renewal";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { members as messages } from "@/lib/messages";
import { renewSchema } from "./schema";
import { stampRecordedBy } from "@/lib/paymentMirror";
import { currentMembership } from "@/lib/currentMembershipServer";
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

    const account = await prisma.user.findUnique({
      where: { id },
      select: { fullName: true, memberNumber: true },
    });
    if (!account) throw new NotFoundError(messages.notFound);

    const current = await currentMembership(prisma, id);
    if (!current) throw new NotFoundError(messages.notFound);

    const refusal = renewalRefusal(
      {
        status: current.status,
        membershipYear: current.year,
        memberNumber: account.memberNumber,
      },
      membershipYear,
    );
    if (refusal) throw new ConflictError(REFUSALS[refusal]);

    const before = await totalPaidFor(prisma, id);

    const renewed = await prisma.$transaction(async (tx) => {
      await tx.membership.create({
        data: {
          userId: id,
          year: membershipYear,
          status: "ACTIVE",
          paymentMethod,
          paymentProof: paymentProof || null,
          recordedBy: session.username,
          reviewedBy: session.username,
          reviewedAt: new Date(),
        },
      });
      await recordMembershipPayment(tx, id, Number(paidAmount), membershipFee);
      await stampRecordedBy(tx, id, membershipYear, session.username);
      return { id, userId: id, membershipYear };
    });

    await logAction(session.username, "RENEW_MEMBER", `${nameOf(account)} — ${membershipYear}`, {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: id,
      before: { membershipYear: current.year, paidAmount: before },
      after: { membershipYear, paidAmount: Number(paidAmount) },
    });

    return NextResponse.json({ member: renewed }, { status: 201 });
  },
);
