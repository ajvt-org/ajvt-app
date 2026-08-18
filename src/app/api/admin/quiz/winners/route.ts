import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { getWinners } from "@/lib/quizRankingServer";

export const GET = withRoute("GET /api/admin/quiz/winners", async () => {
  await requireAdminRole("QUIZ");
  return NextResponse.json(await getWinners());
});
