import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { getStandings } from "@/lib/quizRankingServer";

export const GET = withRoute("GET /api/quiz/standings", async () => {
  const session = await requireUser();
  return NextResponse.json(await getStandings(session.userId));
});
