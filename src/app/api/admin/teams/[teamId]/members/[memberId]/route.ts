import { NextRequest, NextResponse } from "next/server";
import { nameOf } from "@/lib/person";
import { requireTeamAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { approveTeamMember, removeTeamMember } from "@/lib/teamRosterServer";

export const PATCH = withRoute(
  "PATCH /api/admin/teams/[teamId]/members/[memberId]",
  async (
    req: NextRequest,
    { params }: { params: Promise<{ teamId: string; memberId: string }> },
  ) => {
    const { teamId, memberId } = await params;
    const session = await requireTeamAccess(teamId);

    const { teamMember, existing } = await approveTeamMember(teamId, memberId);

    await logAction(
      session.username,
      "APPROVE_TEAM_JOIN",
      `${nameOf(existing.user)} — ${existing.team.name}`,
      {
        ...auditContext(session, req),
        targetType: "TeamMember",
        targetId: existing.id,
        before: { status: existing.status },
        after: { status: teamMember.status },
      },
    );

    return NextResponse.json({ teamMember });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/teams/[teamId]/members/[memberId]",
  async (
    req: NextRequest,
    { params }: { params: Promise<{ teamId: string; memberId: string }> },
  ) => {
    const { teamId, memberId } = await params;
    const session = await requireTeamAccess(teamId);

    const existing = await removeTeamMember(teamId, memberId);

    await logAction(
      session.username,
      "REMOVE_TEAM_MEMBER",
      `${nameOf(existing.user)} — ${existing.team.name}`,
      {
        ...auditContext(session, req),
        targetType: "TeamMember",
        targetId: existing.id,
        before: { teamId, memberId, status: existing.status },
      },
    );

    return NextResponse.json({ ok: true });
  },
);
