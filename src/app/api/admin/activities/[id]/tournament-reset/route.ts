import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { resetTournament, tournamentResetCounts } from "@/lib/tournamentResetServer";
import { counted } from "@/lib/arabicCount";
import { MATCH } from "@/lib/messages";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/tournament-reset",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);

    return NextResponse.json(await tournamentResetCounts(id));
  },
);

export const POST = withRoute(
  "POST /api/admin/activities/[id]/tournament-reset",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);

    const counts = await resetTournament(id);

    await logAction(session.username, "RESET_TOURNAMENT", counted(counts.matches, MATCH));
    return NextResponse.json({ ok: true, ...counts });
  },
);
