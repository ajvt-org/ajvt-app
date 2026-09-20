import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { validateSchema } from "./schema";
import { logger } from "@/lib/logger";
import { members, memberStatusLabels, notify } from "@/lib/messages";
import { nameOf } from "@/lib/person";
import { recordMembershipVerdict } from "@/lib/membershipVerdictServer";

export const POST = withRoute("Validate", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const { id, action, rejectionReason } = parse(validateSchema, await req.json());
  const reason = (rejectionReason as string | null | undefined) ?? null;

  const { person, before } = await recordMembershipVerdict({
    userId: id,
    status: action,
    rejectionReason: reason,
    reviewedBy: session.username,
  });

  const statusLabel: Record<string, string> = memberStatusLabels;
  const transition = before.status
    ? members.statusTransition(statusLabel[before.status], statusLabel[action])
    : "";

  await logAction(
    session.username,
    action === "ACTIVE" ? "APPROVE_MEMBER" : "REJECT_MEMBER",
    `${nameOf(person)}${transition}`,
    {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: id,
      before,
      after: {
        status: action,
        memberNumber: person.memberNumber,
        rejectionReason: action === "REJECTED" ? reason || null : null,
      },
    },
  );

  sendPushToUser(id, notify.membershipDecision(action === "ACTIVE"), "MEMBERSHIP_DECISION").catch(
    (err) => logger.error("push.notify.error", err),
  );

  return NextResponse.json({ member: { id, userId: id, status: action } });
});
