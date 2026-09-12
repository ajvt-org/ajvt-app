import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { getAppSettings } from "@/lib/settingsServer";
import { recordMembershipPayment, totalPaidFor } from "@/lib/membershipPaymentServer";
import { currentMembershipPaid } from "@/lib/currentMembershipServer";
import { amountConsequence } from "@/lib/membershipShortfall";
import { endMembership, restoreMembership } from "@/lib/membershipEndingServer";
import { endedDetails, restoredDetails } from "@/lib/membershipEndingAudit";
import { AMOUNT_BELOW_FEE } from "@/lib/texts";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { members as messages } from "@/lib/messages";
import { memberPaymentSchema } from "./schema";
import { accountIdError } from "@/lib/paymentAccountsServer";
import { nameOf } from "@/lib/person";
import { releaseUploads } from "@/lib/uploadRelease";
import {
  amountAfterEdit,
  feeAfterEdit,
  methodAfterEdit,
  touchesPayment,
} from "@/lib/membershipFeeEdit";

export const PUT = withRoute(
  "PUT /api/admin/members/[id]/payment",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const {
      amountTransferred,
      paymentMethod,
      accountId,
      paymentProof,
      bankReference,
      paidOn,
      membershipDecision,
    } = parse(memberPaymentSchema, await req.json());
    const { membershipFee } = await getAppSettings();

    const account = await prisma.user.findUnique({
      where: { id },
      select: { fullName: true },
    });
    if (!account) throw new NotFoundError(messages.notFound);
    const current = await currentMembershipPaid(prisma, id);
    if (!current) throw new NotFoundError(messages.notFound);

    const feeApplied = current.feeApplied ?? membershipFee;

    const consequence =
      amountTransferred === undefined
        ? null
        : amountConsequence(amountTransferred, feeApplied, current);
    if (consequence === "endable" && membershipDecision !== "end") {
      throw new ValidationError(messages.shortfallNeedsDecision);
    }
    const ends = consequence === "endable";
    const restores = consequence === "restorable" && membershipDecision === "restore";

    const edit = {
      amountTransferred,
      paymentMethod,
      accountId,
      paymentProof,
      bankReference,
      paidOn,
    };

    const wrongAccount = await accountIdError(
      methodAfterEdit(edit, current),
      accountId,
      current.accountId,
    );
    if (wrongAccount) throw new ValidationError(wrongAccount);

    const before = await totalPaidFor(prisma, id);

    const endedAt = new Date();

    await prisma.$transaction(async (tx) => {
      if (touchesPayment(edit)) {
        await recordMembershipPayment(
          tx,
          id,
          amountAfterEdit(edit, before),
          feeApplied,
          feeAfterEdit(edit, current),
        );
      }
      if (ends) {
        await endMembership(tx, id, current.year, {
          reason: AMOUNT_BELOW_FEE,
          by: session.username,
          at: endedAt,
        });
      }
      if (restores) await restoreMembership(tx, id, current.year);
    });

    await releaseUploads(current.paymentProof);

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

    const membershipLabel = `${nameOf(account)} — ${current.year}`;
    const onMembership = {
      ...auditContext(session, req),
      targetType: "Member" as const,
      targetId: id,
    };

    if (ends) {
      await logAction(session.username, "END_MEMBERSHIP", membershipLabel, {
        ...onMembership,
        ...endedDetails(current.year, {
          reason: AMOUNT_BELOW_FEE,
          by: session.username,
          at: endedAt,
        }),
      });
    }

    if (restores) {
      await logAction(session.username, "RESTORE_MEMBERSHIP", membershipLabel, {
        ...onMembership,
        ...restoredDetails(current),
      });
    }

    return NextResponse.json({ amountTransferred: await totalPaidFor(prisma, id) });
  },
);
