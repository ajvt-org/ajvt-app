import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { fillDaysFromBank } from "@/lib/quizPoolServer";

export const POST = withRoute("POST /api/admin/quiz/days/fill", async (req: NextRequest) => {
  const session = await requireAdminRole("QUIZ");
  const filled = await fillDaysFromBank();

  await logAction(session.username, "FILL_QUIZ_DAYS", `${filled}`, {
    ...auditContext(session, req),
    targetType: "QuizDay",
    meta: { filled },
  });

  return NextResponse.json({ filled });
});
