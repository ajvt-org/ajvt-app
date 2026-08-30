import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { issueMembership } from "@/lib/member";
import { sendPushToUser } from "@/lib/push";
import { logAction, auditContext } from "@/lib/audit";
import { mirrorMembershipStatus } from "@/lib/paymentMirror";
import { recordMembershipYear, setMembershipStatus } from "@/lib/membershipRecord";
import { currentMembership } from "@/lib/currentMembershipServer";
import { getAppSettings } from "@/lib/settingsServer";
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

  const { membershipFee } = await getAppSettings();
  const member = await prisma.member.findUnique({
    where: { id },
    select: { userId: true, user: { select: { memberNumber: true } } },
  });
  const existing = member ? await currentMembership(prisma, member.userId) : null;
  let issued: { memberNumber: string; verifyToken: string } | undefined;
  if (action === "ACTIVE" && !member?.user.memberNumber) {
    issued = await issueMembership();
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (!member || !existing) throw new ValidationError(members.notFound);
    await setMembershipStatus(
      tx,
      member.userId,
      existing.year,
      {
        status: action,
        rejectionReason: action === "REJECTED" ? rejectionReason || null : null,
        reviewedBy: session.username,
      },
      new Date(),
    );
    if (issued) await tx.user.update({ where: { id: member.userId }, data: issued });
    if (action === "ACTIVE") {
      await recordMembershipYear(tx, member.userId, existing.year, membershipFee, {
        paymentMethod: existing.paymentMethod,
        paymentProof: existing.paymentProof,
        recordedBy: session.username,
      });
    }
    await mirrorMembershipStatus(tx, member.userId, existing.year, action);
    return { userId: member.userId };
  });

  const person = await prisma.user.findUniqueOrThrow({
    where: { id: updated.userId },
    select: { fullName: true, memberNumber: true },
  });

  const statusLabel: Record<string, string> = memberStatusLabels;
  const transition = existing
    ? ` (من ${statusLabel[existing.status]} إلى ${statusLabel[action]})`
    : "";
  await logAction(
    session.username,
    action === "ACTIVE" ? "APPROVE_MEMBER" : "REJECT_MEMBER",
    `${nameOf(person)}${transition}`,
    {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: id,
      before: { status: existing?.status, memberNumber: member?.user.memberNumber ?? null },
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
