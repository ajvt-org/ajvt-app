import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { reassignAgeGroup } from "@/lib/ageGroupsServer";

export const POST = withRoute("POST /api/admin/age-groups/reassign", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const body = await req.json();

  const { from, target, moved } = await reassignAgeGroup(body.from, body.to);

  await logAction(session.username, "REASSIGN_AGE_GROUP", `${from} → ${target.name}`, {
    ...auditContext(session, req),
    targetType: "AgeGroup",
    targetId: target.id,
    before: { name: from },
    after: { name: target.name },
    meta: { membersRenamed: moved },
  });

  return NextResponse.json({ moved });
});
