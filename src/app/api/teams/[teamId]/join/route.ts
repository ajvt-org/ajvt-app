import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { NotFoundError } from "@/lib/errors";
import { teamMemberSchema } from "./schema";
import { members } from "@/lib/messages";
import { refuseWhenLocked, requireTeamBuilder } from "@/lib/teamBuildingServer";
import { teamOrNotFound } from "@/lib/teamInvitesServer";
import { joinTeam, leaveTeam } from "@/lib/teamJoinServer";

export const POST = withRoute(
  "POST /api/teams/[teamId]/join",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const { userId } = parse(teamMemberSchema, await req.json());

    const team = await teamOrNotFound(teamId);
    const { userId: viewerId, activity } = await requireTeamBuilder(team.activityId);
    if (userId !== viewerId) throw new NotFoundError(members.notFound);
    refuseWhenLocked(activity);

    await joinTeam(teamId, team.activityId, viewerId);

    return NextResponse.json({ ok: true });
  },
);

export const DELETE = withRoute(
  "DELETE /api/teams/[teamId]/join",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const session = await requireUser();
    const { teamId } = await params;
    const { userId } = parse(teamMemberSchema, await req.json());

    if (userId !== session.userId) throw new NotFoundError(members.notFound);

    await leaveTeam(teamId, session.userId);

    return NextResponse.json({ ok: true });
  },
);
