import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { getQuizLeaderboard } from "@/lib/quiz";

export async function GET() {
  try {
    await requireAdminRole("QUIZ");
    const leaderboard = await getQuizLeaderboard();
    return NextResponse.json({ leaderboard });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err instanceof Error && err.message === "FORBIDDEN") return NextResponse.json({ error: "غير مسموح" }, { status: 403 });
    console.error("Quiz leaderboard error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
