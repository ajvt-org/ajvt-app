import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { computeIsCorrect, isQuizEligible } from "@/lib/quiz";

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();

    if (!(await isQuizEligible(session.userId))) {
      return NextResponse.json(
        { error: "المسابقة متاحة فقط للمنتسبين الذين دفعوا رسوم الانتساب" },
        { status: 403 },
      );
    }

    const { assignmentId, selectedAnswerIds } = await req.json();

    if (!assignmentId || typeof assignmentId !== "string") {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    if (
      !Array.isArray(selectedAnswerIds) ||
      selectedAnswerIds.some((id) => typeof id !== "string")
    ) {
      return NextResponse.json({ error: "يجب اختيار إجابة واحدة على الأقل" }, { status: 400 });
    }

    const assignment = await prisma.quizAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        userId: true,
        answeredAt: true,
        question: { select: { points: true, answers: { select: { id: true, isCorrect: true } } } },
      },
    });

    if (!assignment || assignment.userId !== session.userId) {
      return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
    }
    if (assignment.answeredAt) {
      return NextResponse.json({ error: "تمت الإجابة على هذا السؤال من قبل" }, { status: 400 });
    }

    const validAnswerIds = new Set(assignment.question.answers.map((a) => a.id));
    if (
      selectedAnswerIds.length === 0 ||
      !selectedAnswerIds.every((id) => validAnswerIds.has(id))
    ) {
      return NextResponse.json({ error: "إجابة غير صالحة" }, { status: 400 });
    }

    const correctAnswerIds = assignment.question.answers
      .filter((a) => a.isCorrect)
      .map((a) => a.id);
    const isCorrect = computeIsCorrect(correctAnswerIds, selectedAnswerIds);
    const pointsAwarded = isCorrect ? assignment.question.points : 0;

    await prisma.quizAssignment.update({
      where: { id: assignment.id },
      data: { answeredAt: new Date(), selectedAnswerIds, isCorrect, pointsAwarded },
    });

    return NextResponse.json({ isCorrect, pointsAwarded, correctAnswerIds });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Quiz answer error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
