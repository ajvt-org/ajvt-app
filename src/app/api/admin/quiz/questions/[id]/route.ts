import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ConflictError } from "@/lib/errors";
import { isForeignKeyViolation } from "@/lib/prismaError";
import { quiz } from "@/lib/messages";
import { counted } from "@/lib/arabicCount";
import { ANSWER } from "@/lib/messages";

interface AnswerInput {
  text: string;
  isCorrect?: boolean;
}

interface QuizQuestionUpdateData {
  text?: string;
  category?: string;
  points?: number;
  active?: boolean;
  correctCount?: number;
  answers?: { create: { text: string; isCorrect: boolean; order: number }[] };
}

export const PATCH = withRoute(
  "PATCH /api/admin/quiz/questions/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("QUIZ");
    const { id } = await params;
    const { text, category, points, correctCount, active, answers } = await req.json();

    const existing = await prisma.quizQuestion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: quiz.questionNotFound }, { status: 404 });
    }

    const rewritesPlay =
      answers !== undefined || correctCount !== undefined || points !== undefined;
    if (rewritesPlay) {
      const [drawn, answered] = await Promise.all([
        prisma.quizRoundQuestion.count({ where: { questionId: id } }),
        prisma.quizAttemptAnswer.count({ where: { questionId: id } }),
      ]);
      if (drawn > 0 || answered > 0) throw new ConflictError(quiz.questionAnswersLocked);
    }

    const data: QuizQuestionUpdateData = {};

    if (text !== undefined) {
      if (!text.trim()) return NextResponse.json({ error: quiz.textRequired }, { status: 400 });
      data.text = text.trim();
    }
    if (category !== undefined) {
      if (!category.trim())
        return NextResponse.json({ error: quiz.categoryRequired }, { status: 400 });
      data.category = category.trim();
    }
    if (points !== undefined) {
      if (!Number.isInteger(points) || points <= 0)
        return NextResponse.json(
          { error: "النقاط يجب أن تكون رقماً صحيحاً موجباً" },
          { status: 400 },
        );
      data.points = points;
    }
    if (active !== undefined) data.active = !!active;

    let finalCorrectCount = existing.correctCount;
    if (correctCount !== undefined) {
      if (!Number.isInteger(correctCount) || correctCount <= 0) {
        return NextResponse.json({ error: "عدد الإجابات الصحيحة غير صالح" }, { status: 400 });
      }
      finalCorrectCount = correctCount;
      data.correctCount = correctCount;
    }

    if (answers !== undefined) {
      if (!Array.isArray(answers) || answers.length < 2) {
        return NextResponse.json({ error: quiz.twoAnswersMinimum }, { status: 400 });
      }
      if ((answers as AnswerInput[]).some((a) => !a?.text?.trim())) {
        return NextResponse.json({ error: quiz.answersNeedText }, { status: 400 });
      }
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
    }

    const question = await prisma.$transaction(async (tx) => {
      if (answers !== undefined) {
        await tx.quizAnswer.deleteMany({ where: { questionId: id } });
        data.answers = {
          create: (answers as AnswerInput[]).map((a, i) => ({
            text: a.text.trim(),
            isCorrect: !!a.isCorrect,
            order: i,
          })),
        };
      }
      return tx.quizQuestion.update({
        where: { id },
        data,
        include: { answers: { orderBy: { order: "asc" } } },
      });
    });

    await logAction(session.username, "UPDATE_QUIZ_QUESTION", question.text.slice(0, 60));

    return NextResponse.json({ question });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/quiz/questions/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("QUIZ");
    const { id } = await params;

    const question = await prisma.quizQuestion.findUnique({
      where: { id },
      select: { text: true },
    });
    if (!question) {
      return NextResponse.json({ error: quiz.questionNotFound }, { status: 404 });
    }

    const [drawn, answered] = await Promise.all([
      prisma.quizRoundQuestion.count({ where: { questionId: id } }),
      prisma.quizAttemptAnswer.count({ where: { questionId: id } }),
    ]);
    if (drawn > 0 || answered > 0) throw new ConflictError(quiz.questionInUse);

    try {
      await prisma.quizQuestion.delete({ where: { id } });
    } catch (err) {
      if (isForeignKeyViolation(err)) throw new ConflictError(quiz.questionInUse);
      throw err;
    }
    await logAction(session.username, "DELETE_QUIZ_QUESTION", question.text.slice(0, 60));

    return NextResponse.json({ ok: true });
  },
);
