import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { copyCompetition } from "@/lib/competitionServer";

export const POST = withRoute(
  "POST /api/admin/quiz/competitions/[id]/copy",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("QUIZ");
    const { id } = await params;
    const competition = await copyCompetition(id);

    await logAction(session.username, "COPY_COMPETITION", competition.name, {
      ...auditContext(session, req),
      targetType: "Competition",
      targetId: competition.id,
      after: { startsAt: competition.startsAt },
    });

    return NextResponse.json({ competition }, { status: 201 });
  },
);
