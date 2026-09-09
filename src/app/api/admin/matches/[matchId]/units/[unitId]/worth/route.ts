import { NextRequest, NextResponse } from "next/server";
import { requireMatchAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { common } from "@/lib/messages";
import { keepWorth, loadSeriesMatch, seriesStateOf } from "@/lib/matchSeriesServer";

type Params = { params: Promise<{ matchId: string; unitId: string }> };

export const PATCH = withRoute(
  "PATCH /api/admin/matches/[matchId]/units/[unitId]/worth",
  async (req: NextRequest, { params }: Params) => {
    const { matchId, unitId } = await params;
    const session = await requireMatchAccess(matchId);

    let body: { kept?: unknown };
    try {
      body = await req.json();
    } catch {
      throw new ValidationError(common.invalidBody);
    }
    if (typeof body.kept !== "boolean") throw new ValidationError(common.invalidBody);

    const unit = await keepWorth(matchId, unitId, body.kept);
    await logAction(session.username, "UPDATE_MATCH_PART_WORTH", String(unit.order));

    return NextResponse.json(seriesStateOf(await loadSeriesMatch(matchId)));
  },
);
