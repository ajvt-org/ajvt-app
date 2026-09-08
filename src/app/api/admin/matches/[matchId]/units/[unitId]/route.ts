import { NextRequest, NextResponse } from "next/server";
import { requireMatchAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { common } from "@/lib/messages";
import { correctUnit, loadSeriesMatch, removeUnit, seriesStateOf } from "@/lib/matchSeriesServer";

type Params = { params: Promise<{ matchId: string; unitId: string }> };

async function stateOf(matchId: string) {
  return seriesStateOf(await loadSeriesMatch(matchId));
}

export const PATCH = withRoute(
  "PATCH /api/admin/matches/[matchId]/units/[unitId]",
  async (req: NextRequest, { params }: Params) => {
    const { matchId, unitId } = await params;
    const session = await requireMatchAccess(matchId);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError(common.invalidBody);
    }

    const unit = await correctUnit(matchId, unitId, body);
    await logAction(session.username, "UPDATE_MATCH_PART", String(unit.order));

    return NextResponse.json(await stateOf(matchId));
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/matches/[matchId]/units/[unitId]",
  async (_req: NextRequest, { params }: Params) => {
    const { matchId, unitId } = await params;
    const session = await requireMatchAccess(matchId);

    const unit = await removeUnit(matchId, unitId);
    await logAction(session.username, "DELETE_MATCH_PART", String(unit.order));

    return NextResponse.json(await stateOf(matchId));
  },
);
