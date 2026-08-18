import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { ForbiddenError } from "@/lib/errors";
import { isQuizEligible, touchUserActivity } from "@/lib/quiz";
import { submitAnswer, currentQuestion } from "@/lib/quizAttemptServer";
import { prisma } from "@/lib/prisma";
import { quiz } from "@/lib/messages";
import { attemptAnswerSchema } from "./schema";

export const POST = withRoute("POST /api/quiz/attempt/answer", async (req: NextRequest) => {
  const session = await requireUser();
  if (!(await isQuizEligible(session.userId))) throw new ForbiddenError(quiz.paidMembersOnly);

  const { answerId, selectedAnswerIds } = parse(attemptAnswerSchema, await req.json());
  const result = await submitAnswer(answerId, session.userId, selectedAnswerIds);

  const row = await prisma.quizAttemptAnswer.findUniqueOrThrow({
    where: { id: answerId },
    select: { attemptId: true },
  });
  const view = await currentQuestion(row.attemptId, session.userId);
  const attempt = await prisma.quizAttempt.findUniqueOrThrow({ where: { id: row.attemptId } });

  await touchUserActivity(session.userId);

  return NextResponse.json({
    ...result,
    score: attempt.score,
    done: view.done,
    total: view.total,
    position: view.position,
    question: view.question,
  });
});
