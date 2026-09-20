import { NextRequest, NextResponse } from "next/server";
import { requireTeamAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { removeTeam, updateTeam } from "@/lib/activityTeamsServer";

function teamAction(
  before: { disabledAt: Date | null },
  after: { disabledAt: Date | null },
): "DISABLE_TEAM" | "ENABLE_TEAM" | "UPDATE_TEAM" {
  if (before.disabledAt === null && after.disabledAt !== null) return "DISABLE_TEAM";
  if (before.disabledAt !== null && after.disabledAt === null) return "ENABLE_TEAM";
  return "UPDATE_TEAM";
}

export const PATCH = withRoute(
  "PATCH /api/admin/teams/[teamId]",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const session = await requireTeamAccess(teamId);

    const { team, existing } = await updateTeam(teamId, await req.json());

    await logAction(session.username, teamAction(existing, team), team.name, {
      ...auditContext(session, req),
      targetType: "Team",
      targetId: team.id,
      before: existing,
      after: {
        name: team.name,
        groupId: team.groupId,
        logo: team.logo,
        captainUserId: team.captainUserId,
        fromHomeVillage: team.fromHomeVillage,
        disabledAt: team.disabledAt,
      },
    });

    return NextResponse.json({ team });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/teams/[teamId]",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const session = await requireTeamAccess(teamId);

    const team = await removeTeam(teamId);

    await logAction(session.username, "DELETE_TEAM", team.name, {
      ...auditContext(session, req),
      targetType: "Team",
      targetId: teamId,
      before: team,
    });

    return NextResponse.json({ ok: true });
  },
);
