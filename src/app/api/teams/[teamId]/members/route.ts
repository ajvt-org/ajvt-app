import { NextRequest, NextResponse } from "next/server";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { ConflictError } from "@/lib/errors";
import { answerRequestSchema, removeMemberSchema } from "./schema";
import { requireCaptainOf } from "@/lib/teamBuildingServer";
import { tournament } from "@/lib/messages";
import { answerJoinRequest, dropFromTeam } from "@/lib/teamRosterServer";

export const PATCH = withRoute(
  "PATCH /api/teams/[teamId]/members",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const { userId, accept } = parse(answerRequestSchema, await req.json());
    const { activity } = await requireCaptainOf(teamId);

    await answerJoinRequest(teamId, userId, activity, accept);

    return NextResponse.json({ ok: true });
  },
);

export const DELETE = withRoute(
  "DELETE /api/teams/[teamId]/members",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const { userId } = parse(removeMemberSchema, await req.json());
    const { userId: captainId } = await requireCaptainOf(teamId);

    if (userId === captainId) throw new ConflictError(tournament.captainCannotLeave);

    await dropFromTeam(teamId, userId);

    return NextResponse.json({ ok: true });
  },
);
