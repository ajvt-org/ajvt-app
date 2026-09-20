import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { activityRoster } from "@/lib/activityRosterServer";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/roster",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);

    return NextResponse.json({ roster: await activityRoster(id) });
  },
);
