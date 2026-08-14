import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { getQuizSettings, sendSameQuestionToAll, sendRandomBatch } from "@/lib/quiz";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminRole("QUIZ");
    const { mode, questionId, count } = await req.json();

    if (mode === "SAME") {
      if (!questionId || typeof questionId !== "string") {
        return NextResponse.json({ error: "يجب اختيار سؤال" }, { status: 400 });
      }
      const question = await prisma.quizQuestion.findUnique({
        where: { id: questionId },
        select: { text: true },
      });
      if (!question) {
        return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
      }

      const result = await sendSameQuestionToAll(questionId);
      await logAction(
        session.username,
        "SEND_QUIZ_QUESTION",
        `نفس السؤال للجميع — ${question.text.slice(0, 40)} (${result.sentCount} مستخدم)`,
      );
      return NextResponse.json(result);
    }

    if (mode === "RANDOM") {
      const settings = await getQuizSettings();
      const finalCount = Number.isInteger(count) && count > 0 ? count : settings.questionsPerDay;

      const result = await sendRandomBatch(finalCount);
      await logAction(
        session.username,
        "SEND_QUIZ_QUESTION",
        `دفعة عشوائية (${result.sentCount} مستخدم)`,
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "طريقة الإرسال غير صالحة" }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err instanceof Error && err.message === "FORBIDDEN")
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    console.error("Quiz send error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
