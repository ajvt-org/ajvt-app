import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { NotFoundError } from "@/lib/errors";
import { activityRegisterSchema } from "./schema";
import { members } from "@/lib/messages";
import { registerSelf, unregisterSelf } from "@/lib/selfRegisterServer";

export const POST = withRoute("POST /api/activities/register", async (req: NextRequest) => {
  const session = await requireUser();
  const { activityId, userId, chosenTeamId } = parse(activityRegisterSchema, await req.json());

  await registerSelf(session.userId, userId, activityId, chosenTeamId);

  return NextResponse.json({ ok: true });
});

export const DELETE = withRoute("DELETE /api/activities/register", async (req: NextRequest) => {
  const session = await requireUser();
  const { userId, activityId } = parse(activityRegisterSchema, await req.json());

  if (userId !== session.userId) throw new NotFoundError(members.notFound);

  const released = await unregisterSelf(session.userId, activityId);

  return NextResponse.json({ ok: true, keptTeamPlace: released.kept > 0 });
});
