import { NextRequest, NextResponse } from "next/server";
import { requireMatchAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { common } from "@/lib/messages";
import { correctPart, loadSeriesMatch, removePart, standingOf } from "@/lib/matchSeriesServer";

type Params = { params: Promise<{ matchId: string; partId: string }> };

async function stateOf(matchId: string) {
  const match = await loadSeriesMatch(matchId);
  return { parts: match.parts, standing: standingOf(match.activity, match.parts) };
}

export const PATCH = withRoute(
  "PATCH /api/admin/matches/[matchId]/parts/[partId]",
  async (req: NextRequest, { params }: Params) => {
    const { matchId, partId } = await params;
    const session = await requireMatchAccess(matchId);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError(common.invalidBody);
    }

    const part = await correctPart(matchId, partId, body);
    await logAction(session.username, "UPDATE_MATCH_PART", String(part.order));

    return NextResponse.json(await stateOf(matchId));
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/matches/[matchId]/parts/[partId]",
  async (_req: NextRequest, { params }: Params) => {
    const { matchId, partId } = await params;
    const session = await requireMatchAccess(matchId);

    const part = await removePart(matchId, partId);
    await logAction(session.username, "DELETE_MATCH_PART", String(part.order));

    return NextResponse.json(await stateOf(matchId));
  },
);
