import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { validatePaidAmount } from "@/lib/donations";
import { getAppSettings } from "@/lib/settingsServer";
import { recordMembershipPayment, totalPaidFor } from "@/lib/membershipPaymentServer";
import { saveMembershipYear } from "@/lib/membershipRecord";
import { currentMembership } from "@/lib/currentMembershipServer";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { members as messages } from "@/lib/messages";
import { memberPaymentSchema } from "./schema";
import { accountIdError } from "@/lib/paymentAccountsServer";
import { nameOf } from "@/lib/person";

export const PUT = withRoute(
  "PUT /api/admin/members/[id]/payment",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { amountTransferred, paymentMethod, accountId, paymentProof } = parse(
      memberPaymentSchema,
      await req.json(),
    );
    const { membershipFee } = await getAppSettings();

    const account = await prisma.user.findUnique({
      where: { id },
      select: { fullName: true },
    });
    if (!account) throw new NotFoundError(messages.notFound);
    const current = await currentMembership(prisma, id);
    if (!current) throw new NotFoundError(messages.notFound);

    if (amountTransferred !== undefined && amountTransferred !== null) {
      const amountError = validatePaidAmount(amountTransferred, membershipFee);
      if (amountError) throw new ValidationError(amountError);
    }

    const named = paymentMethod !== undefined ? paymentMethod : current.paymentMethod;
    const wrongAccount = await accountIdError(named, accountId, current.accountId);
    if (wrongAccount) throw new ValidationError(wrongAccount);

    const before = await totalPaidFor(prisma, id);

    await prisma.$transaction(async (tx) => {
      if (paymentMethod !== undefined || accountId !== undefined || paymentProof !== undefined) {
        await saveMembershipYear(tx, id, current.year, {
          ...(paymentMethod !== undefined ? { paymentMethod } : {}),
          ...(accountId !== undefined ? { accountId: accountId || null } : {}),
          ...(paymentProof !== undefined ? { paymentProof } : {}),
        });
      }
      if (amountTransferred !== undefined) {
        await recordMembershipPayment(tx, id, amountTransferred, membershipFee);
      }
    });

    await logAction(session.username, "UPDATE_MEMBER_PAYMENT", nameOf(account), {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: id,
      before: { amountTransferred: before, paymentProof: current.paymentProof },
      after: {
        amountTransferred: amountTransferred === undefined ? before : amountTransferred,
        paymentProof: paymentProof === undefined ? current.paymentProof : paymentProof,
      },
    });

    return NextResponse.json({ amountTransferred: await totalPaidFor(prisma, id) });
  },
);
