import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { computeIsCorrect, isQuizEligible } from "@/lib/quiz";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { quizAnswerSchema } from "./schema";
import { quiz } from "@/lib/messages";

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
  const isCorrect = computeIsCorrect(correctAnswerIds, selectedAnswerIds);
  const pointsAwarded = isCorrect ? assignment.question.points : 0;

  await prisma.quizAssignment.update({
    where: { id: assignment.id },
    data: { answeredAt: new Date(), selectedAnswerIds, isCorrect, pointsAwarded },
  });

  return NextResponse.json({ isCorrect, pointsAwarded, correctAnswerIds });
});
