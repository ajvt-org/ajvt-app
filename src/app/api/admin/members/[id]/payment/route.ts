import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { validatePaidAmount } from "@/lib/donations";
import { getAppSettings } from "@/lib/settingsServer";
import { recordMembershipPayment, totalPaidFor } from "@/lib/membershipPaymentServer";
import { syncMembershipRecord } from "@/lib/membershipRecord";
import { splitPayment } from "@/lib/membershipPayment";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { members as messages } from "@/lib/messages";
import { memberPaymentSchema } from "./schema";

export const PUT = withRoute(
  "PUT /api/admin/members/[id]/payment",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { amountTransferred, paymentMethod, paymentProof } = parse(
      memberPaymentSchema,
      await req.json(),
    );
    const { membershipFee } = await getAppSettings();

    const existing = await prisma.member.findUnique({
      where: { id },
      select: { fullName: true, membershipYear: true, paidAmount: true },
    });
    if (!existing) throw new NotFoundError(messages.notFound);

    if (amountTransferred !== null) {
      const amountError = validatePaidAmount(amountTransferred, membershipFee);
      if (amountError) throw new ValidationError(amountError);
    }

    const before = await totalPaidFor(prisma, id);

    const member = await prisma.$transaction(async (tx) => {
      if (paymentMethod !== undefined || paymentProof !== undefined) {
        await tx.member.update({
          where: { id },
          data: {
            ...(paymentMethod !== undefined ? { paymentMethod } : {}),
            ...(paymentProof !== undefined ? { paymentProof } : {}),
          },
        });
      }
      await recordMembershipPayment(tx, id, amountTransferred, membershipFee);
      await syncMembershipRecord(tx, id, existing.membershipYear, {
        paidAmount:
          amountTransferred === null ? null : splitPayment(amountTransferred, membershipFee).fee,
        ...(paymentMethod !== undefined ? { paymentMethod } : {}),
      });
      return tx.member.findUniqueOrThrow({ where: { id } });
    });

    await logAction(session.username, "UPDATE_MEMBER_PAYMENT", existing.fullName, {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: id,
      before: { amountTransferred: before },
      after: { amountTransferred },
    });

    return NextResponse.json({
      member,
      amountTransferred: await totalPaidFor(prisma, id),
    });
  },
);
