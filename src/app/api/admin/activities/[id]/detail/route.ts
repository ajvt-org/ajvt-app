import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { activityDetail } from "@/lib/activityDetailServer";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/detail",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);

    return NextResponse.json(await activityDetail(id));
  },
);
