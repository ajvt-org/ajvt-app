import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { issueMembership } from "@/lib/member";
import { sendPushToUser } from "@/lib/push";
import { logAction, auditContext } from "@/lib/audit";
import { recordFeeVerdict } from "@/lib/membershipPaymentServer";
import type { MembershipVerdict } from "@/lib/membershipVerdict";
import { setMembershipStatus } from "@/lib/membershipRecord";
import { currentMembership } from "@/lib/currentMembershipServer";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { members, memberStatusLabels, notify } from "@/lib/messages";
import { nameOf } from "@/lib/person";

export const POST = withRoute("Validate", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const { id, action, rejectionReason } = await req.json();

  if (!id || !["ACTIVE", "REJECTED"].includes(action)) {
    throw new ValidationError();
  }
  if (action === "REJECTED") {
    if (rejectionReason === undefined || rejectionReason === null || rejectionReason === "") {
      throw new ValidationError(members.rejectionReasonRequired);
    }
    if (!REJECTION_REASONS.includes(rejectionReason)) {
      throw new ValidationError(members.rejectionReasonInvalid);
    }
  }

  const account = await prisma.user.findUnique({
    where: { id },
    select: { memberNumber: true },
  });
  const existing = account ? await currentMembership(prisma, id) : null;
  const needsNumber = action === "ACTIVE" && !account?.memberNumber;

  const updated = await prisma.$transaction(async (tx) => {
    if (!account || !existing) throw new ValidationError(members.notFound);
    const issued = needsNumber ? await issueMembership(tx) : undefined;
    const verdict: MembershipVerdict = {
      status: action,
      rejectionReason: action === "REJECTED" ? rejectionReason || null : null,
      reviewedBy: session.username,
    };
    await recordFeeVerdict(tx, id, existing.year, verdict, new Date());
    await setMembershipStatus(tx, id, existing.year, verdict);
    if (issued) await tx.user.update({ where: { id }, data: issued });
    return { userId: id };
  });

  const person = await prisma.user.findUniqueOrThrow({
    where: { id: updated.userId },
    select: { fullName: true, memberNumber: true },
  });

  const statusLabel: Record<string, string> = memberStatusLabels;
  const transition = existing
    ? members.statusTransition(statusLabel[existing.status], statusLabel[action])
    : "";
  await logAction(
    session.username,
    action === "ACTIVE" ? "APPROVE_MEMBER" : "REJECT_MEMBER",
    `${nameOf(person)}${transition}`,
    {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: id,
      before: { status: existing?.status, memberNumber: account?.memberNumber ?? null },
      after: {
        status: action,
        memberNumber: person.memberNumber,
        rejectionReason: action === "REJECTED" ? rejectionReason || null : null,
      },
    },
  );

  if (updated.userId) {
    sendPushToUser(
      updated.userId,
      notify.membershipDecision(action === "ACTIVE"),
      "MEMBERSHIP_DECISION",
    ).catch((err) => logger.error("push.notify.error", err));
  }

  return NextResponse.json({ member: { id, userId: updated.userId, status: action } });
});
