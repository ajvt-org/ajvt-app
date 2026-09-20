import { NextRequest, NextResponse } from "next/server";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { handoverSchema } from "./schema";
import { requireCaptainOf } from "@/lib/teamBuildingServer";
import { deleteOwnTeam, handOverCaptaincy } from "@/lib/ownTeamServer";

export const PATCH = withRoute(
  "PATCH /api/teams/[teamId]",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const { captainUserId } = parse(handoverSchema, await req.json());
    const { activity } = await requireCaptainOf(teamId);

    await handOverCaptaincy(teamId, captainUserId, activity);

    return NextResponse.json({ ok: true });
  },
);

export const DELETE = withRoute(
  "DELETE /api/teams/[teamId]",
  async (_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const { team } = await requireCaptainOf(teamId);

    await deleteOwnTeam(team.id);

    return NextResponse.json({ ok: true });
  },
);
