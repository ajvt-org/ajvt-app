import { NextRequest, NextResponse } from "next/server";
import { requireMatchAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { common, tournament } from "@/lib/messages";
import { loadSeriesMatch, recordMove, seriesStateOf } from "@/lib/matchSeriesServer";

type Params = { params: Promise<{ matchId: string }> };

const SIDES = new Set(["SIDE_A", "SIDE_B"]);

export const POST = withRoute(
  "POST /api/admin/matches/[matchId]/moves",
  async (req: NextRequest, { params }: Params) => {
    const { matchId } = await params;
    const session = await requireMatchAccess(matchId);

    let body: { ruleId?: unknown; side?: unknown; unitId?: unknown };
    try {
      body = await req.json();
    } catch {
      throw new ValidationError(common.invalidBody);
    }
    if (typeof body.ruleId !== "string" || typeof body.side !== "string" || !SIDES.has(body.side)) {
      throw new ValidationError(tournament.moveRuleNotFound);
    }
    if (typeof body.unitId !== "string" || !body.unitId) {
      throw new ValidationError(tournament.moveWantsAUnit);
    }

    const recorded = await recordMove(
      matchId,
      body.ruleId,
      body.side as "SIDE_A" | "SIDE_B",
      body.unitId,
    );
    await logAction(session.username, "RECORD_MATCH_ADJUSTMENT", recorded.unitId);

    return NextResponse.json(seriesStateOf(await loadSeriesMatch(matchId)), { status: 201 });
  },
);
