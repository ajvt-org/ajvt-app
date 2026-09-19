import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAdminRole } from "@/lib/auth";
import { scopedActivityIds } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { activityCreateSchema } from "./schema";
import { ForbiddenError } from "@/lib/errors";
import { seesEveryActivity } from "@/lib/activityAccess";
import { activityRows } from "@/lib/activitiesServer";
import { createActivity } from "@/lib/activityCreateServer";

export const GET = withRoute("GET /api/admin/activities", async () => {
  const session = await requireAdmin();
  const scoped = await scopedActivityIds(session);
  if (scoped === null && !seesEveryActivity(session.role)) {
    throw new ForbiddenError();
  }

  return NextResponse.json({ activities: await activityRows(scoped) });
});

export const POST = withRoute("POST /api/admin/activities", async (req: NextRequest) => {
  const session = await requireAdminRole("ACTIVITIES");
  const activity = await createActivity(parse(activityCreateSchema, await req.json()));

  await logAction(session.username, "CREATE_ACTIVITY", activity.title, {
    ...auditContext(session, req),
    targetType: "Activity",
    targetId: activity.id,
    after: {
      title: activity.title,
      period: activity.period,
      capacity: activity.capacity,
      isTournament: activity.isTournament,
      format: activity.format,
      isVolunteer: activity.isVolunteer,
      startsAt: activity.startsAt,
      endsAt: activity.endsAt,
      withTime: activity.withTime,
    },
  });

  return NextResponse.json({ activity }, { status: 201 });
});
