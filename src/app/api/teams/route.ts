import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { newTeamSchema } from "./schema";
import { refuseSecondTeam, requireTeamBuilder } from "@/lib/teamBuildingServer";
import { myTeamView } from "@/lib/myTeamServer";
import { common } from "@/lib/messages";

export const GET = withRoute("GET /api/teams", async (req: NextRequest) => {
  const activityId = req.nextUrl.searchParams.get("activityId");
  if (!activityId) {
    return NextResponse.json({ error: common.invalidBody }, { status: 400 });
  }

  const { userId, activity } = await requireTeamBuilder(activityId);
  return NextResponse.json(await myTeamView(activity, userId));
});

export const POST = withRoute("POST /api/teams", async (req: NextRequest) => {
  const { activityId, name } = parse(newTeamSchema, await req.json());
  const { userId, activity } = await requireTeamBuilder(activityId);
  await refuseSecondTeam(activityId, userId);

  const team = await prisma.$transaction(async (tx) => {
    const created = await tx.team.create({
      data: { activityId, name, autoNamed: false, captainUserId: userId },
      select: { id: true },
    });
    await tx.teamMember.create({ data: { teamId: created.id, userId, status: "ACTIVE" } });
    return created;
  });

  return NextResponse.json(await myTeamView(activity, userId, team.id), { status: 201 });
});
