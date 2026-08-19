import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { listRounds, setRoundPool } from "@/lib/quizPoolServer";
import { common } from "@/lib/messages";

export const GET = withRoute("GET /api/admin/quiz/rounds", async () => {
  await requireAdminRole("QUIZ");
  const { competition, rounds } = await listRounds();
  return NextResponse.json({
    rounds,
    servedCount: competition.servedCount,
    poolSize: competition.poolSize,
    startedAt: competition.startedAt,
  });
});

export const PUT = withRoute("PUT /api/admin/quiz/rounds", async (req: NextRequest) => {
  const session = await requireAdminRole("QUIZ");
  let body: { index?: unknown; questionIds?: unknown };
  try {
    body = await req.json();
  } catch {
    throw new ValidationError(common.invalidBody);
  }
  if (!Number.isInteger(body.index) || !Array.isArray(body.questionIds)) {
    throw new ValidationError(common.invalidBody);
  }

  const result = await setRoundPool(body.index as number, body.questionIds as string[]);

  await logAction(session.username, "SET_QUIZ_ROUND_POOL", String(result.index), {
    ...auditContext(session, req),
    targetType: "QuizRound",
    after: { loaded: result.loaded },
  });

  return NextResponse.json(result);
});
