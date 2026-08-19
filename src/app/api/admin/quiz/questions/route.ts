import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { getQuizSettings } from "@/lib/quiz";
import { withRoute } from "@/lib/route";
import { quiz } from "@/lib/messages";
import { pointsInRange, normalisePoints } from "@/lib/quizDifficulty";
import { counted } from "@/lib/arabicCount";
import { ANSWER } from "@/lib/messages";

interface AnswerInput {
  text: string;
  isCorrect?: boolean;
}

export const GET = withRoute("GET /api/admin/quiz/questions", async () => {
  await requireAdminRole("QUIZ");

  const [questions, sentCounts, answeredCounts, correctCounts] = await Promise.all([
    prisma.quizQuestion.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        text: true,
        category: true,
        points: true,
        correctCount: true,
        active: true,
        createdAt: true,
        answers: {
          select: { id: true, text: true, isCorrect: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    }),
    prisma.quizAttemptAnswer.groupBy({ by: ["questionId"], _count: true }),
    prisma.quizAttemptAnswer.groupBy({
      by: ["questionId"],
      where: { answeredAt: { not: null } },
      _count: true,
    }),
    prisma.quizAttemptAnswer.groupBy({
      by: ["questionId"],
      where: { isCorrect: true },
      _count: true,
    }),
  ]);

  const sentMap = new Map(sentCounts.map((c) => [c.questionId, c._count]));
  const answeredMap = new Map(answeredCounts.map((c) => [c.questionId, c._count]));
  const correctMap = new Map(correctCounts.map((c) => [c.questionId, c._count]));

  const result = questions.map((q) => ({
    ...q,
    sentCount: sentMap.get(q.id) ?? 0,
    answeredCount: answeredMap.get(q.id) ?? 0,
    correctSubmissions: correctMap.get(q.id) ?? 0,
  }));

  return NextResponse.json({ questions: result });
});

export const POST = withRoute("POST /api/admin/quiz/questions", async (req: NextRequest) => {
  const session = await requireAdminRole("QUIZ");
  const { text, category, points, correctCount, answers } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: quiz.textRequired }, { status: 400 });
  }
  if (!category?.trim()) {
    return NextResponse.json({ error: quiz.categoryRequired }, { status: 400 });
  }
  if (!Array.isArray(answers) || answers.length < 2) {
    return NextResponse.json({ error: quiz.twoAnswersMinimum }, { status: 400 });
  }
  if ((answers as AnswerInput[]).some((a) => !a?.text?.trim())) {
    return NextResponse.json({ error: quiz.answersNeedText }, { status: 400 });
  }

  if (points !== undefined && points !== null && !pointsInRange(points)) {
    return NextResponse.json({ error: quiz.pointsOutOfRange }, { status: 400 });
  }
  const settings = await getQuizSettings();
  const finalPoints =
    points === undefined || points === null ? settings.defaultPoints : normalisePoints(points);
  const finalCorrectCount =
    Number.isInteger(correctCount) && correctCount > 0
      ? correctCount
      : settings.defaultCorrectCount;

  if (finalCorrectCount > answers.length) {
    return NextResponse.json({ error: quiz.tooManyCorrect }, { status: 400 });
  }
  const correctGiven = (answers as AnswerInput[]).filter((a) => a.isCorrect).length;
  if (correctGiven !== finalCorrectCount) {
    return NextResponse.json(
      { error: `يجب تحديد ${counted(finalCorrectCount, ANSWER)} (إجابات) صحيحة بالضبط` },
      { status: 400 },
    );
  }

  const question = await prisma.quizQuestion.create({
    data: {
      text: text.trim(),
      category: category.trim(),
      points: finalPoints,
      correctCount: finalCorrectCount,
      createdBy: session.username,
      answers: {
        create: (answers as AnswerInput[]).map((a, i) => ({
          text: a.text.trim(),
          isCorrect: !!a.isCorrect,
          order: i,
        })),
      },
    },
    include: { answers: { orderBy: { order: "asc" } } },
  });

  await logAction(session.username, "CREATE_QUIZ_QUESTION", question.text.slice(0, 60));

  return NextResponse.json({ question }, { status: 201 });
});
