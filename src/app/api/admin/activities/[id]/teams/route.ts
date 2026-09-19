import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { createActivityTeam, listActivityTeams } from "@/lib/activityTeamsServer";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/teams",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);

    return NextResponse.json({ teams: await listActivityTeams(id) });
  },
);

export const POST = withRoute(
  "POST /api/admin/activities/[id]/teams",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);

    const team = await createActivityTeam(id, await req.json());

    await logAction(session.username, "CREATE_TEAM", team.name, {
      ...auditContext(session, req),
      targetType: "Team",
      targetId: team.id,
      after: { name: team.name, activityId: id, groupId: team.groupId },
    });

    return NextResponse.json({ team }, { status: 201 });
  },
);
