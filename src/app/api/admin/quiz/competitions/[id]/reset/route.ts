import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { resetCompetitionScores } from "@/lib/competitionServer";

export const POST = withRoute(
  "POST /api/admin/quiz/competitions/[id]/reset",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("QUIZ");
    const { id } = await params;
    const cleared = await resetCompetitionScores(id);

    await logAction(session.username, "RESET_QUIZ_SCORES", `${cleared}`, {
      ...auditContext(session, req),
      targetType: "Competition",
      targetId: id,
    });

    return NextResponse.json({ cleared });
  },
);
