import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { computeIsCorrect, isQuizEligible } from "@/lib/quiz";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { quizAnswerSchema } from "./schema";
import { quiz } from "@/lib/messages";
import { windowExpired, elapsedMs, DEFAULT_ANSWER_WINDOW_SECONDS } from "@/lib/quizWindow";
import { timeScore } from "@/lib/quizScore";

export const POST = withRoute("POST /api/quiz/answer", async (req: NextRequest) => {
  const session = await requireUser();

  if (!(await isQuizEligible(session.userId))) {
    return NextResponse.json({ error: quiz.paidMembersOnly }, { status: 403 });
  }

  const { assignmentId, selectedAnswerIds } = parse(quizAnswerSchema, await req.json());

  const assignment = await prisma.quizAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      userId: true,
      answeredAt: true,
      revealedAt: true,
      question: { select: { points: true, answers: { select: { id: true, isCorrect: true } } } },
    },
  });

  if (!assignment || assignment.userId !== session.userId) {
    return NextResponse.json({ error: quiz.questionNotFound }, { status: 404 });
  }
  if (assignment.answeredAt) {
    return NextResponse.json({ error: quiz.alreadyAnswered }, { status: 400 });
  }
  if (!assignment.revealedAt) {
    return NextResponse.json({ error: quiz.optionsNotRevealed }, { status: 400 });
  }

  const validAnswerIds = new Set(assignment.question.answers.map((a) => a.id));
  if (selectedAnswerIds.length === 0 || !selectedAnswerIds.every((id) => validAnswerIds.has(id))) {
    return NextResponse.json({ error: "إجابة غير صالحة" }, { status: 400 });
  }

  const correctAnswerIds = assignment.question.answers.filter((a) => a.isCorrect).map((a) => a.id);
  const now = new Date();
  const expired = windowExpired(assignment.revealedAt, now, DEFAULT_ANSWER_WINDOW_SECONDS);
  const isCorrect = !expired && computeIsCorrect(correctAnswerIds, selectedAnswerIds);
  const answeredInMs = elapsedMs(assignment.revealedAt, now);
  const pointsAwarded = isCorrect
    ? timeScore({
        points: assignment.question.points,
        elapsedMs: answeredInMs,
        windowSeconds: DEFAULT_ANSWER_WINDOW_SECONDS,
      })
    : 0;

  const closed = await prisma.quizAssignment.updateMany({
    where: { id: assignment.id, answeredAt: null },
    data: { answeredAt: now, selectedAnswerIds, isCorrect, pointsAwarded },
  });
  if (closed.count === 0) {
    return NextResponse.json({ error: quiz.alreadyAnswered }, { status: 400 });
  }

  return NextResponse.json({
    isCorrect,
    pointsAwarded,
    correctAnswerIds,
    expired,
    answeredInMs,
    maxPoints: assignment.question.points,
  });
});
