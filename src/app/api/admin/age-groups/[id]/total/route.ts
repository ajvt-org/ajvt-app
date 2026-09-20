import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ageGroups as messages } from "@/lib/messages";
import { setAgeGroupTotal } from "@/lib/ageGroupsServer";

export const PATCH = withRoute(
  "PATCH /api/admin/age-groups/[id]/total",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { totalCount } = await req.json();

    const { ageGroup, existing } = await setAgeGroupTotal(id, totalCount);

    await logAction(
      session.username,
      "UPDATE_AGE_GROUP",
      messages.totalChanged(ageGroup.name, totalCount),
      {
        ...auditContext(session, req),
        targetType: "AgeGroup",
        targetId: ageGroup.id,
        before: { totalCount: existing.totalCount },
        after: { totalCount: ageGroup.totalCount },
      },
    );

    return NextResponse.json({ ageGroup });
  },
);
