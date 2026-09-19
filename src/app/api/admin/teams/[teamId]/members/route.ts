import { NextRequest, NextResponse } from "next/server";
import { requireTeamAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { logAction, auditContext } from "@/lib/audit";
import { parse } from "@/lib/validation";
import { teamMemberSchema } from "@/app/api/teams/[teamId]/join/schema";
import { nameOf } from "@/lib/person";
import { addTeamMember } from "@/lib/teamRosterServer";

export const POST = withRoute(
  "POST /api/admin/teams/[teamId]/members",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const session = await requireTeamAccess(teamId);
    const { userId } = parse(teamMemberSchema, await req.json());

    const { teamMember, team } = await addTeamMember(teamId, userId);

    await logAction(
      session.username,
      "ADD_TEAM_MEMBER",
      `${nameOf(teamMember.user)} → ${team.name}`,
      {
        ...auditContext(session, req),
        targetType: "TeamMember",
        targetId: teamMember.id,
        after: { teamId, userId, teamName: team.name },
      },
    );

    return NextResponse.json({ teamMember }, { status: 201 });
  },
);
