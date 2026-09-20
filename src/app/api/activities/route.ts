import { NextResponse } from "next/server";
import { withRoute } from "@/lib/route";
import { publicActivityRows } from "@/lib/publicActivitiesServer";

export const GET = withRoute("GET /api/activities", async () => {
  return NextResponse.json({ activities: await publicActivityRows() });
});
