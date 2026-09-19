import { NextRequest, NextResponse } from "next/server";
import { requireActivityFinanceAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { viewerOf } from "@/lib/supportViewer";
import { activityLedger } from "@/lib/activityFinanceServer";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/finance",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityFinanceAccess(id);

    return NextResponse.json(await activityLedger(id, viewerOf(session)));
  },
);
