import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { ValidationError } from "@/lib/errors";
import { members as messages } from "@/lib/messages";
import { isEndingReason } from "@/lib/membershipEnding";
import { endMembershipByAdmin, restoreMembershipByAdmin } from "@/lib/membershipEndingServer";
import { endedDetails, restoredDetails } from "@/lib/membershipEndingAudit";
import { nameOf } from "@/lib/person";
import { endMembershipSchema } from "./schema";

export const POST = withRoute(
  "POST /api/admin/members/[id]/end-membership",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { reason } = parse(endMembershipSchema, await req.json());
    if (!isEndingReason(reason)) throw new ValidationError(messages.endingReasonInvalid);

    const ending = { reason, by: session.username, at: new Date() };
    const { person, year } = await endMembershipByAdmin(id, ending);

    await logAction(session.username, "END_MEMBERSHIP", `${nameOf(person)} — ${year}`, {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: id,
      ...endedDetails(year, ending),
    });

    return NextResponse.json({
      membership: { year, endedAt: ending.at.toISOString(), endedReason: reason },
    });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/members/[id]/end-membership",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const { person, membership } = await restoreMembershipByAdmin(id);

    await logAction(
      session.username,
      "RESTORE_MEMBERSHIP",
      `${nameOf(person)} — ${membership.year}`,
      {
        ...auditContext(session, req),
        targetType: "Member",
        targetId: id,
        ...restoredDetails(membership),
      },
    );

    return NextResponse.json({ membership: { year: membership.year, endedAt: null } });
  },
);
