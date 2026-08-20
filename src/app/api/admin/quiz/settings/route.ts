import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { getQuizSettings, updateQuizSettings } from "@/lib/quiz";
import { withRoute } from "@/lib/route";
import { pointsInRange } from "@/lib/quizDifficulty";
import { quiz } from "@/lib/messages";

export const GET = withRoute("GET /api/admin/quiz/settings", async () => {
  await requireAdminRole("QUIZ");
  const settings = await getQuizSettings();
  return NextResponse.json({ settings });
});

export const PATCH = withRoute("PATCH /api/admin/quiz/settings", async (req: NextRequest) => {
  const session = await requireAdminRole("QUIZ");
  const { defaultAnswerCount, defaultCorrectCount, defaultPoints, confirmAnswers } =
    await req.json();

  const data: {
    defaultAnswerCount?: number;
    defaultCorrectCount?: number;
    defaultPoints?: number;
    confirmAnswers?: boolean;
  } = {};

  if (confirmAnswers !== undefined) {
    if (typeof confirmAnswers !== "boolean") {
      return NextResponse.json({ error: "قيمة زر التأكيد غير صالحة" }, { status: 400 });
    }
    data.confirmAnswers = confirmAnswers;
  }

  for (const [key, value] of Object.entries({
    defaultAnswerCount,
    defaultCorrectCount,
    defaultPoints,
  })) {
    if (value === undefined) continue;
    if (!Number.isInteger(value) || value <= 0) {
      return NextResponse.json({ error: "القيم يجب أن تكون أرقاماً صحيحة موجبة" }, { status: 400 });
    }
    (data as Record<string, number>)[key] = value;
  }

  if (data.defaultPoints !== undefined && !pointsInRange(data.defaultPoints)) {
    return NextResponse.json({ error: quiz.pointsOutOfRange }, { status: 400 });
  }

  if (
    data.defaultCorrectCount !== undefined &&
    data.defaultAnswerCount !== undefined &&
    data.defaultCorrectCount > data.defaultAnswerCount
  ) {
    return NextResponse.json(
      { error: "عدد الإجابات الصحيحة لا يمكن أن يتجاوز عدد الإجابات" },
      { status: 400 },
    );
  }

  const settings = await updateQuizSettings(data);
  await logAction(session.username, "UPDATE_QUIZ_SETTINGS");

  return NextResponse.json({ settings });
});
