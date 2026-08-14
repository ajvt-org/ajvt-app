import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { getQuizSettings, sendSameQuestionToAll, sendRandomBatch } from "@/lib/quiz";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";

export const POST = withRoute("POST /api/admin/quiz/send", async (req: NextRequest) => {
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
});
