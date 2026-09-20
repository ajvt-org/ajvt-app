import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { approveAgeGroup, removeAgeGroup, renameAgeGroup } from "@/lib/ageGroupsServer";

export const PATCH = withRoute(
  "PATCH /api/admin/age-groups/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { name, approved } = await req.json();
    const context = auditContext(session, req);

    if (approved === true && name === undefined) {
      const ageGroup = await approveAgeGroup(id);
      await logAction(session.username, "APPROVE_AGE_GROUP", ageGroup.name, {
        ...context,
        targetType: "AgeGroup",
        targetId: ageGroup.id,
        before: { approved: false },
        after: { approved: true },
      });
      return NextResponse.json({ ageGroup });
    }

    const { ageGroup, existing, moved } = await renameAgeGroup(id, name);

    await logAction(session.username, "UPDATE_AGE_GROUP", `${existing.name} → ${ageGroup.name}`, {
      ...context,
      targetType: "AgeGroup",
      targetId: ageGroup.id,
      before: { name: existing.name },
      after: { name: ageGroup.name },
      meta: { membersRenamed: moved },
    });

    return NextResponse.json({ ageGroup });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/age-groups/[id]",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const existing = await removeAgeGroup(id);
    await logAction(session.username, "DELETE_AGE_GROUP", existing.name);

    return NextResponse.json({ ok: true });
  },
);
