import { NextRequest, NextResponse } from "next/server";
import { requireMatchAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { common } from "@/lib/messages";
import { addPart, loadSeriesMatch, standingOf } from "@/lib/matchSeriesServer";

type Params = { params: Promise<{ matchId: string }> };

export const GET = withRoute(
  "GET /api/admin/matches/[matchId]/parts",
  async (_req: NextRequest, { params }: Params) => {
    const { matchId } = await params;
    await requireMatchAccess(matchId);

    const match = await loadSeriesMatch(matchId);
    return NextResponse.json({
      parts: match.parts,
      standing: standingOf(match.activity, match.parts, match.isKnockout),
    });
  },
);

export const POST = withRoute(
  "POST /api/admin/matches/[matchId]/parts",
  async (req: NextRequest, { params }: Params) => {
    const { matchId } = await params;
    const session = await requireMatchAccess(matchId);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError(common.invalidBody);
    }

    const part = await addPart(matchId, body);
    await logAction(session.username, "ADD_MATCH_PART", String(part.order));

    const match = await loadSeriesMatch(matchId);
    return NextResponse.json(
      {
        part,
        parts: match.parts,
        standing: standingOf(match.activity, match.parts, match.isKnockout),
      },
      { status: 201 },
    );
  },
);
