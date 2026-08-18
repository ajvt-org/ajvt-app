import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { ForbiddenError } from "@/lib/errors";
import { isQuizEligible } from "@/lib/quiz";
import { startOrResumeAttempt, currentQuestion } from "@/lib/quizAttemptServer";
import { quiz } from "@/lib/messages";

export const POST = withRoute("POST /api/quiz/attempt", async () => {
  const session = await requireUser();
  if (!(await isQuizEligible(session.userId))) throw new ForbiddenError(quiz.paidMembersOnly);

  const attempt = await startOrResumeAttempt(session.userId);
  const view = await currentQuestion(attempt.id, session.userId);

  return NextResponse.json({
    attemptId: attempt.id,
    score: attempt.score,
    done: view.done,
    total: view.total,
    position: view.position,
    question: view.question,
  });
});
