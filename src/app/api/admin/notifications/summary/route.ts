import { NextResponse } from "next/server";
import { requireUnscopedAdmin } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { notificationSummary } from "@/lib/adminSummaryServer";

export const GET = withRoute("GET /api/admin/notifications/summary", async () => {
  const session = await requireUnscopedAdmin();

  return NextResponse.json(await notificationSummary(session.role));
});
