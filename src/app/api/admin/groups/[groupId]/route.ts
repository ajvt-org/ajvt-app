import { NextRequest, NextResponse } from "next/server";
import { requireGroupAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { removeGroup, updateGroup } from "@/lib/activityGroupsServer";

export const PATCH = withRoute(
  "PATCH /api/admin/groups/[groupId]",
  async (req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) => {
    const { groupId } = await params;
    const session = await requireGroupAccess(groupId);

    const { group, before } = await updateGroup(groupId, await req.json());

    await logAction(session.username, "UPDATE_GROUP", group.name, {
      ...auditContext(session, req),
      targetType: "Group",
      targetId: group.id,
      before,
      after: { name: group.name, capacity: group.capacity },
    });

    return NextResponse.json({ group });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/groups/[groupId]",
  async (_req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) => {
    const { groupId } = await params;
    const session = await requireGroupAccess(groupId);

    const group = await removeGroup(groupId);
    await logAction(session.username, "DELETE_GROUP", group.name);

    return NextResponse.json({ ok: true });
  },
);
