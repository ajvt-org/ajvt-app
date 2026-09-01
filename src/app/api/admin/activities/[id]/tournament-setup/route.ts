import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { parseMatchDate } from "@/lib/clubTime";
import { setUpTournament } from "@/lib/tournamentSetupServer";
import { counted } from "@/lib/arabicCount";
import { MATCH } from "@/lib/messages";
import { tournamentSetupSchema } from "./schema";

export const POST = withRoute(
  "POST /api/admin/activities/[id]/tournament-setup",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const body = parse(tournamentSetupSchema, await req.json());

    const result = await setUpTournament(id, {
      format: body.format,
      groups: body.groups,
      qualifierCount: body.qualifierCount,
      startsAt: parseMatchDate(body.startsAt),
      times: body.times,
      venue: body.venue?.trim() || null,
    });

    await logAction(
      session.username,
      "SET_UP_TOURNAMENT",
      counted(result.groupMatches + result.knockoutMatches, MATCH),
    );
    return NextResponse.json({ ok: true, ...result });
  },
);
