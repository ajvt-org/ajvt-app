import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { duplicateActivity } from "@/lib/activityCreateServer";

export const POST = withRoute(
  "POST /api/admin/activities/[id]/duplicate",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);

    const { activity, sourceId } = await duplicateActivity(id);

    await logAction(session.username, "DUPLICATE_ACTIVITY", activity.title, {
      ...auditContext(session, req),
      targetType: "Activity",
      targetId: activity.id,
      before: { copiedFrom: sourceId },
      after: { title: activity.title, published: false },
    });

    return NextResponse.json({ activity });
  },
);
