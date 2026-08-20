import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { reopenMissedQuestions } from "@/lib/quizAttemptServer";

export const POST = withRoute(
  "POST /api/admin/quiz/attempts/[id]/reopen",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const { id } = await params;
    const { reopened, userId, round } = await reopenMissedQuestions(id);

    await logAction(session.username, "REOPEN_QUIZ_ATTEMPT", `${reopened}`, {
      ...auditContext(session, req),
      targetType: "QuizAttempt",
      targetId: id,
      meta: { userId, round, reopened },
    });

    return NextResponse.json({ reopened });
  },
);
