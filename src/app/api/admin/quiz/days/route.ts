import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { listDays, setDayPool } from "@/lib/quizPoolServer";
import { common } from "@/lib/messages";

export const GET = withRoute("GET /api/admin/quiz/days", async () => {
  await requireAdminRole("QUIZ");
  const { competition, days } = await listDays();
  return NextResponse.json({
    days,
    servedCount: competition.servedCount,
    poolSize: competition.poolSize,
    startedAt: competition.startedAt,
  });
});

export const PUT = withRoute("PUT /api/admin/quiz/days", async (req: NextRequest) => {
  const session = await requireAdminRole("QUIZ");
  let body: { day?: unknown; questionIds?: unknown };
  try {
    body = await req.json();
  } catch {
    throw new ValidationError(common.invalidBody);
  }
  if (typeof body.day !== "string" || !Array.isArray(body.questionIds)) {
    throw new ValidationError(common.invalidBody);
  }

  const result = await setDayPool(body.day, body.questionIds as string[]);

  await logAction(session.username, "SET_QUIZ_DAY_POOL", result.day, {
    ...auditContext(session, req),
    targetType: "QuizDay",
    after: { loaded: result.loaded },
  });

  return NextResponse.json(result);
});
