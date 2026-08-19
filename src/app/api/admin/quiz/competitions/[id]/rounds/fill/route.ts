import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { fillRoundsFromBank } from "@/lib/quizPoolServer";

type Params = { params: Promise<{ id: string }> };

export const POST = withRoute(
  "POST /api/admin/quiz/competitions/[id]/rounds/fill",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireAdminRole("QUIZ");
    const { id } = await params;
    const filled = await fillRoundsFromBank(id);

    await logAction(session.username, "FILL_QUIZ_ROUNDS", `${filled}`, {
      ...auditContext(session, req),
      targetType: "QuizRound",
      targetId: id,
      meta: { filled },
    });

    return NextResponse.json({ filled });
  },
);
