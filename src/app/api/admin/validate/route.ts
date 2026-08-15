import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { generateMemberNumber } from "@/lib/member";
import { sendPushToUser } from "@/lib/push";
import { logAction, auditContext } from "@/lib/audit";
import { syncMembershipDonation } from "@/lib/donationsServer";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const POST = withRoute("Validate", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const { id, action, rejectionReason } = await req.json();

  if (!id || !["ACTIVE", "REJECTED"].includes(action)) {
    throw new ValidationError();
  }
  if (
    action === "REJECTED" &&
    rejectionReason !== undefined &&
    rejectionReason !== null &&
    !REJECTION_REASONS.includes(rejectionReason)
  ) {
    throw new ValidationError("سبب الرفض غير صالح");
  }

  const existing = await prisma.member.findUnique({
    where: { id },
    select: { status: true, memberNumber: true, rejectionReason: true },
  });
  let memberNumber: string | undefined;
  if (action === "ACTIVE" && !existing?.memberNumber) {
    memberNumber = await generateMemberNumber();
  }

  const updated = await prisma.$transaction(async (tx) => {
    const m = await tx.member.update({
      where: { id },
      data: {
        status: action,
        ...(memberNumber ? { memberNumber } : {}),
        // A stale reason from a past rejection shouldn't linger once approved.
        rejectionReason: action === "REJECTED" ? rejectionReason || null : null,
      },
    });
    await syncMembershipDonation(tx, id);
    return m;
  });

  const statusLabel: Record<string, string> = {
    PENDING: "قيد الانتظار",
    ACTIVE: "مقبول",
    REJECTED: "غير مقبول",
  };
  const transition = existing
    ? ` (من ${statusLabel[existing.status]} إلى ${statusLabel[action]})`
    : "";
  await logAction(
    session.username,
    action === "ACTIVE" ? "APPROVE_MEMBER" : "REJECT_MEMBER",
    `${updated.fullName}${transition}`,
    {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: updated.id,
      before: existing,
      after: {
        status: updated.status,
        memberNumber: updated.memberNumber,
        rejectionReason: updated.rejectionReason,
      },
    },
  );

  if (updated.userId) {
    sendPushToUser(updated.userId, {
      title: "رابطة شباب التاكلالت",
      body:
        action === "ACTIVE"
          ? `تهانينا! تم قبول عضوية ${updated.fullName} 🎉`
          : `نأسف، لم يتم قبول طلب انضمام ${updated.fullName}`,
      url: "/home",
    }).catch((err) => logger.error("push.notify.error", err));
  }

  return NextResponse.json({ member: updated });
});
