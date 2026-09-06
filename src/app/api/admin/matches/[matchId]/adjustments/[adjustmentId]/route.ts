import { NextRequest, NextResponse } from "next/server";
import { requireMatchAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { loadSeriesMatch, seriesStateOf, undoAdjustment } from "@/lib/matchSeriesServer";

type Params = { params: Promise<{ matchId: string; adjustmentId: string }> };

export const DELETE = withRoute(
  "DELETE /api/admin/matches/[matchId]/adjustments/[adjustmentId]",
  async (_req: NextRequest, { params }: Params) => {
    const { matchId, adjustmentId } = await params;
    const session = await requireMatchAccess(matchId);

    const undone = await undoAdjustment(matchId, adjustmentId);
    await logAction(session.username, "UNDO_MATCH_ADJUSTMENT", String(undone.order));

    return NextResponse.json(seriesStateOf(await loadSeriesMatch(matchId)));
  },
);
