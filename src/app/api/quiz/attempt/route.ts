import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { isQuizEligible } from "@/lib/quiz";
import { canPlay, NO_COMPETITION } from "@/lib/competitionServer";
import { startOrResumeAttempt, currentQuestion } from "@/lib/quizAttemptServer";
import { quiz } from "@/lib/messages";

export const POST = withRoute("POST /api/quiz/attempt", async (req: NextRequest) => {
  const session = await requireUser();
  if (!(await isQuizEligible(session.userId))) throw new ForbiddenError(quiz.paidMembersOnly);

  let body: { competitionId?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const competitionId = typeof body.competitionId === "string" ? body.competitionId : null;
  if (!competitionId) throw new ValidationError(NO_COMPETITION);
  if (!(await canPlay(competitionId, session.userId))) throw new ForbiddenError(quiz.notInvited);

  const attempt = await startOrResumeAttempt(competitionId, session.userId);
  const view = await currentQuestion(attempt.id, session.userId);

  return NextResponse.json({
    attemptId: attempt.id,
    score: view.done ? attempt.score : undefined,
    done: view.done,
    total: view.total,
    position: view.position,
    curve: view.curve,
    confirm: view.confirm,
    question: view.question,
  });
});
