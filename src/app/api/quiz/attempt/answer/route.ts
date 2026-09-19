import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { ForbiddenError } from "@/lib/errors";
import { isQuizEligible, touchUserActivity } from "@/lib/quiz";
import { submitAnswer, currentQuestion } from "@/lib/quizAttemptServer";
import { quiz } from "@/lib/messages";
import { attemptAnswerSchema } from "./schema";

export const POST = withRoute("POST /api/quiz/attempt/answer", async (req: NextRequest) => {
  const session = await requireUser();
  if (!(await isQuizEligible(session.userId))) throw new ForbiddenError(quiz.paidMembersOnly);

  const { answerId, selectedAnswerIds } = parse(attemptAnswerSchema, await req.json());
  const { attemptId } = await submitAnswer(answerId, session.userId, selectedAnswerIds);
  const view = await currentQuestion(attemptId, session.userId);

  await touchUserActivity(session.userId);

  return NextResponse.json({
    done: view.done,
    total: view.total,
    position: view.position,
    curve: view.curve,
    confirm: view.confirm,
    question: view.question,
  });
});
