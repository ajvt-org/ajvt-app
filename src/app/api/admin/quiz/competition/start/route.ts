import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { startCompetition } from "@/lib/competitionServer";

export const POST = withRoute(
  "POST /api/admin/quiz/competition/start",
  async (req: NextRequest) => {
    const session = await requireAdminRole("QUIZ");
    const competition = await startCompetition();

    await logAction(session.username, "START_COMPETITION", competition.name, {
      ...auditContext(session, req),
      targetType: "Competition",
      targetId: competition.id,
      after: { startedAt: competition.startedAt },
    });

    return NextResponse.json({ competition });
  },
);
