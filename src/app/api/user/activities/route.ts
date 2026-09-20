import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { myActivities } from "@/lib/myActivitiesServer";

export const GET = withRoute("GET /api/user/activities", async () => {
  const session = await requireUser();

  return NextResponse.json({ rows: await myActivities(session.userId) });
});
