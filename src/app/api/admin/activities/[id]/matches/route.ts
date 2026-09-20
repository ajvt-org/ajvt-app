import { NextRequest, NextResponse } from "next/server";
import { listMatches } from "@/lib/adminMatchesServer";
import { createActivityMatch } from "@/lib/adminMatchCreateServer";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { notifyTeams } from "@/lib/tournamentNotify";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { notify } from "@/lib/messages";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/matches",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);

    return NextResponse.json(await listMatches(id));
  },
);

export const POST = withRoute(
  "POST /api/admin/activities/[id]/matches",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);

    const { match, first, second, entrant } = await createActivityMatch(id, await req.json());

    await logAction(session.username, "CREATE_MATCH", `${first.name} × ${second.name}`, {
      ...auditContext(session, req),
      targetType: "Match",
      targetId: match.id,
      after: {
        activityId: id,
        firstTeam: first.name,
        secondTeam: second.name,
        matchDate: match.matchDate,
        isKnockout: match.isKnockout,
      },
    });

    notifyTeams(
      first.id,
      second.id,
      notify.matchScheduled(first.name, second.name, id, entrant),
    ).catch((err) => logger.error("match.created.push.error", err));

    return NextResponse.json({ match }, { status: 201 });
  },
);
