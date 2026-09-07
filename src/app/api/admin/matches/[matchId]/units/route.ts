import { NextRequest, NextResponse } from "next/server";
import { requireMatchAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { common } from "@/lib/messages";
import { addUnit, loadSeriesMatch, seriesStateOf } from "@/lib/matchSeriesServer";

type Params = { params: Promise<{ matchId: string }> };

export const GET = withRoute(
  "GET /api/admin/matches/[matchId]/units",
  async (_req: NextRequest, { params }: Params) => {
    const { matchId } = await params;
    await requireMatchAccess(matchId);

    const match = await loadSeriesMatch(matchId);
    return NextResponse.json(seriesStateOf(match));
  },
);

export const POST = withRoute(
  "POST /api/admin/matches/[matchId]/units",
  async (req: NextRequest, { params }: Params) => {
    const { matchId } = await params;
    const session = await requireMatchAccess(matchId);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError(common.invalidBody);
    }

    const unit = await addUnit(matchId, body);
    await logAction(session.username, "ADD_MATCH_PART", String(unit.order));

    const match = await loadSeriesMatch(matchId);
    return NextResponse.json({ unit, ...seriesStateOf(match) }, { status: 201 });
  },
);
