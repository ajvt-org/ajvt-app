import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { getQuizSettings } from "@/lib/quiz";

interface AnswerInput {
  text: string;
  isCorrect?: boolean;
}

export async function GET() {
  try {
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
          answers: { select: { id: true, text: true, isCorrect: true, order: true }, orderBy: { order: "asc" } },
        },
      }),
      prisma.quizAssignment.groupBy({ by: ["questionId"], _count: true }),
      prisma.quizAssignment.groupBy({ by: ["questionId"], where: { answeredAt: { not: null } }, _count: true }),
      prisma.quizAssignment.groupBy({ by: ["questionId"], where: { isCorrect: true }, _count: true }),
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
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err instanceof Error && err.message === "FORBIDDEN") return NextResponse.json({ error: "غير مسموح" }, { status: 403 });
    console.error("Quiz questions list error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminRole("QUIZ");
    const { text, category, points, correctCount, answers } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "نص السؤال مطلوب" }, { status: 400 });
    }
    if (!category?.trim()) {
      return NextResponse.json({ error: "التصنيف مطلوب" }, { status: 400 });
    }
    if (!Array.isArray(answers) || answers.length < 2) {
      return NextResponse.json({ error: "يجب إضافة إجابتين على الأقل" }, { status: 400 });
    }
    if ((answers as AnswerInput[]).some((a) => !a?.text?.trim())) {
      return NextResponse.json({ error: "كل الإجابات يجب أن تحتوي على نص" }, { status: 400 });
    }

    const settings = await getQuizSettings();
    const finalPoints = Number.isInteger(points) && points > 0 ? points : settings.defaultPoints;
    const finalCorrectCount = Number.isInteger(correctCount) && correctCount > 0 ? correctCount : settings.defaultCorrectCount;

    if (finalCorrectCount > answers.length) {
      return NextResponse.json({ error: "عدد الإجابات الصحيحة أكبر من عدد الإجابات" }, { status: 400 });
    }
    const correctGiven = (answers as AnswerInput[]).filter((a) => a.isCorrect).length;
    if (correctGiven !== finalCorrectCount) {
      return NextResponse.json({ error: `يجب تحديد ${finalCorrectCount} إجابة (إجابات) صحيحة بالضبط` }, { status: 400 });
    }

    const question = await prisma.quizQuestion.create({
      data: {
        text: text.trim(),
        category: category.trim(),
        points: finalPoints,
        correctCount: finalCorrectCount,
        createdBy: session.username,
        answers: {
          create: (answers as AnswerInput[]).map((a, i) => ({ text: a.text.trim(), isCorrect: !!a.isCorrect, order: i })),
        },
      },
      include: { answers: { orderBy: { order: "asc" } } },
    });

    await logAction(session.username, "CREATE_QUIZ_QUESTION", question.text.slice(0, 60));

    return NextResponse.json({ question }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err instanceof Error && err.message === "FORBIDDEN") return NextResponse.json({ error: "غير مسموح" }, { status: 403 });
    console.error("Quiz question create error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
