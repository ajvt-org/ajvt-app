import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { scopedActivityIds } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { ForbiddenError } from "@/lib/errors";
import { activityAttention } from "@/lib/activityAttentionServer";
import { seesEveryActivity } from "@/lib/activityAccess";

export const GET = withRoute("GET /api/admin/activities/attention", async () => {
  const session = await requireAdmin();
  const scoped = await scopedActivityIds(session);
  if (scoped === null && !seesEveryActivity(session.role)) {
    throw new ForbiddenError();
  }

  return NextResponse.json({ waiting: await activityAttention(scoped) });
});
