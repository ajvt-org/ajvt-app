import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { fillRoundsFromBank } from "@/lib/quizPoolServer";

export const POST = withRoute("POST /api/admin/quiz/rounds/fill", async (req: NextRequest) => {
  const session = await requireAdminRole("QUIZ");
  const filled = await fillRoundsFromBank();

  await logAction(session.username, "FILL_QUIZ_ROUNDS", `${filled}`, {
    ...auditContext(session, req),
    targetType: "QuizRound",
    meta: { filled },
  });

  return NextResponse.json({ filled });
});
