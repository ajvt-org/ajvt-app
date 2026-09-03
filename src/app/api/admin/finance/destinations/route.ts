import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { scopedActivityIds } from "@/lib/activityAccessServer";
import { seesEveryActivity } from "@/lib/activityAccess";
import { listMoneyDestinations } from "@/lib/destinationsServer";
import { withRoute } from "@/lib/route";
import { ForbiddenError } from "@/lib/errors";

export const GET = withRoute("GET /api/admin/finance/destinations", async () => {
  const session = await requireAdmin();
  const scoped = await scopedActivityIds(session);
  if (scoped === null && !seesEveryActivity(session.role)) {
    throw new ForbiddenError();
  }

  return NextResponse.json({ destinations: await listMoneyDestinations(scoped) });
});
