import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { getQuizSettings, updateQuizSettings } from "@/lib/quiz";

export async function GET() {
  try {
    await requireAdminRole("QUIZ");
    const settings = await getQuizSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err instanceof Error && err.message === "FORBIDDEN") return NextResponse.json({ error: "غير مسموح" }, { status: 403 });
    console.error("Quiz settings get error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdminRole("QUIZ");
    const { defaultAnswerCount, defaultCorrectCount, defaultPoints, questionsPerDay } = await req.json();

    const data: { defaultAnswerCount?: number; defaultCorrectCount?: number; defaultPoints?: number; questionsPerDay?: number } = {};

    for (const [key, value] of Object.entries({ defaultAnswerCount, defaultCorrectCount, defaultPoints, questionsPerDay })) {
      if (value === undefined) continue;
      if (!Number.isInteger(value) || value <= 0) {
        return NextResponse.json({ error: "القيم يجب أن تكون أرقاماً صحيحة موجبة" }, { status: 400 });
      }
      (data as Record<string, number>)[key] = value;
    }
    if (data.defaultCorrectCount !== undefined && data.defaultAnswerCount !== undefined && data.defaultCorrectCount > data.defaultAnswerCount) {
      return NextResponse.json({ error: "عدد الإجابات الصحيحة لا يمكن أن يتجاوز عدد الإجابات" }, { status: 400 });
    }

    const settings = await updateQuizSettings(data);
    await logAction(session.username, "UPDATE_QUIZ_SETTINGS");

    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err instanceof Error && err.message === "FORBIDDEN") return NextResponse.json({ error: "غير مسموح" }, { status: 403 });
    console.error("Quiz settings update error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
