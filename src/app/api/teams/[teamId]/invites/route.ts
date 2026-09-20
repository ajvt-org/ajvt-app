import { NextRequest, NextResponse } from "next/server";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { answerSchema, inviteSchema } from "./schema";
import { refuseWhenLocked, requireCaptainOf, requireTeamBuilder } from "@/lib/teamBuildingServer";
import { answerInvitation, inviteToTeam, teamOrNotFound } from "@/lib/teamInvitesServer";
import { notifyTeamInvitation } from "@/lib/tournamentNotify";

export const POST = withRoute(
  "POST /api/teams/[teamId]/invites",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const { userId } = parse(inviteSchema, await req.json());
    const { activity, team } = await requireCaptainOf(teamId);

    await inviteToTeam(teamId, userId, activity);
    await notifyTeamInvitation(userId, team.name, activity.id);

    return NextResponse.json({ ok: true }, { status: 201 });
  },
);

export const PATCH = withRoute(
  "PATCH /api/teams/[teamId]/invites",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const { accept } = parse(answerSchema, await req.json());

    const team = await teamOrNotFound(teamId);
    const { userId, activity } = await requireTeamBuilder(team.activityId);
    refuseWhenLocked(activity);

    await answerInvitation(teamId, userId, activity, accept);

    return NextResponse.json({ ok: true });
  },
);
