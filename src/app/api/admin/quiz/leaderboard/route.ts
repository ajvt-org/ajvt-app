import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { getQuizLeaderboard } from "@/lib/quiz";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/admin/quiz/leaderboard", async () => {
  await requireAdminRole("QUIZ");
  const leaderboard = await getQuizLeaderboard();
  return NextResponse.json({ leaderboard });
});
