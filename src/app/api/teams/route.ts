import { NextRequest, NextResponse } from "next/server";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { ValidationError } from "@/lib/errors";
import { newTeamSchema } from "./schema";
import {
  createOwnTeam,
  refuseSecondTeam,
  refuseWhenLocked,
  requireTeamBuilder,
} from "@/lib/teamBuildingServer";
import { myTeamView } from "@/lib/myTeamServer";
import { common } from "@/lib/messages";

export const GET = withRoute("GET /api/teams", async (req: NextRequest) => {
  const activityId = req.nextUrl.searchParams.get("activityId");
  if (!activityId) throw new ValidationError(common.invalidBody);

  const { userId, activity } = await requireTeamBuilder(activityId);

  return NextResponse.json(await myTeamView(activity, userId));
});

export const POST = withRoute("POST /api/teams", async (req: NextRequest) => {
  const { activityId, name } = parse(newTeamSchema, await req.json());
  const { userId, activity } = await requireTeamBuilder(activityId);
  refuseWhenLocked(activity);
  await refuseSecondTeam(activityId, userId);

  await createOwnTeam(activityId, userId, name);

  return NextResponse.json(await myTeamView(activity, userId), { status: 201 });
});
