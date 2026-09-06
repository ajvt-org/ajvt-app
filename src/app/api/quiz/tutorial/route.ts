import { NextResponse } from "next/server";
import { withRoute } from "@/lib/route";
import { getQuizSettings, tutorialCurve } from "@/lib/quiz";
import { tutorialQuestions } from "@/lib/quizTutorialServer";

export const GET = withRoute("GET /api/quiz/tutorial", async () => {
  const [questions, settings] = await Promise.all([tutorialQuestions(), getQuizSettings()]);
  return NextResponse.json({ questions, curve: tutorialCurve(settings) });
});
