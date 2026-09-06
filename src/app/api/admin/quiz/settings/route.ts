import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { getQuizSettings, tutorialCurve, updateQuizSettings } from "@/lib/quiz";
import { withRoute } from "@/lib/route";
import { pointsInRange } from "@/lib/quizDifficulty";
import { validateCurve } from "@/lib/competitionConfig";
import { quiz } from "@/lib/messages";

function pickGiven(given: Record<string, unknown>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(given).filter(([, value]) => value !== undefined),
  ) as Record<string, number>;
}

export const GET = withRoute("GET /api/admin/quiz/settings", async () => {
  await requireAdminRole("QUIZ");
  const settings = await getQuizSettings();
  return NextResponse.json({ settings });
});

export const PATCH = withRoute("PATCH /api/admin/quiz/settings", async (req: NextRequest) => {
  const session = await requireAdminRole("QUIZ");
  const {
    defaultAnswerCount,
    defaultCorrectCount,
    defaultPoints,
    confirmAnswers,
    tutorialFullSeconds,
    tutorialMaxSeconds,
    tutorialFloorPercent,
  } = await req.json();

  const data: {
    defaultAnswerCount?: number;
    defaultCorrectCount?: number;
    defaultPoints?: number;
    confirmAnswers?: boolean;
    tutorialFullSeconds?: number;
    tutorialMaxSeconds?: number;
    tutorialFloorPercent?: number;
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

  const given = { tutorialFullSeconds, tutorialMaxSeconds, tutorialFloorPercent };
  if (Object.values(given).some((value) => value !== undefined)) {
    const current = await getQuizSettings();
    const wanted = { ...current, ...pickGiven(given) };
    const curveProblem = validateCurve(tutorialCurve(wanted));
    if (curveProblem) return NextResponse.json({ error: curveProblem }, { status: 400 });
    Object.assign(data, pickGiven(given));
  }

  const settings = await updateQuizSettings(data);
  await logAction(session.username, "UPDATE_QUIZ_SETTINGS");

  return NextResponse.json({ settings });
});
