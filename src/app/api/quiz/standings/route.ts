import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { getStandings } from "@/lib/quizRankingServer";
import { announceOpenDay } from "@/lib/quizNotify";
import { logger } from "@/lib/logger";

export const GET = withRoute("GET /api/quiz/standings", async () => {
  const session = await requireUser();
  announceOpenDay().catch((err) => logger.error("quiz.announce.error", err));
  return NextResponse.json(await getStandings(session.userId));
});
