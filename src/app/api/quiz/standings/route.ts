import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { getStandings } from "@/lib/quizRankingServer";
import { canPlay, runningCompetitionsFor } from "@/lib/competitionServer";
import { announceOpenDay } from "@/lib/quizNotify";
import { closeExpiredAttempts } from "@/lib/quizAttemptServer";
import { logger } from "@/lib/logger";

export const GET = withRoute("GET /api/quiz/standings", async (req: NextRequest) => {
  const session = await requireUser();
  announceOpenDay().catch((err) => logger.error("quiz.announce.error", err));
  closeExpiredAttempts().catch((err) => logger.error("quiz.close.error", err));

  const asked = req.nextUrl.searchParams.get("competition");
  const allowed = asked ? await canPlay(asked, session.userId) : false;
  const id = allowed ? asked : ((await runningCompetitionsFor(session.userId))[0]?.id ?? null);

  return NextResponse.json(await getStandings(id, session.userId));
});
