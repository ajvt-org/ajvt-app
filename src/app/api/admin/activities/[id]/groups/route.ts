import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { createActivityGroup, listActivityGroups } from "@/lib/activityGroupsServer";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/groups",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);

    return NextResponse.json(await listActivityGroups(id));
  },
);

export const POST = withRoute(
  "POST /api/admin/activities/[id]/groups",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);

    const group = await createActivityGroup(id, await req.json());

    await logAction(session.username, "CREATE_GROUP", group.name, {
      ...auditContext(session, req),
      targetType: "Group",
      targetId: group.id,
      after: { name: group.name, activityId: id, capacity: group.capacity },
    });

    return NextResponse.json({ group }, { status: 201 });
  },
);
