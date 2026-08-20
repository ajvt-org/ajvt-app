import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { boardBlock, getStandings } from "@/lib/quizRankingServer";
import { canPlay, runningCompetitionsFor } from "@/lib/competitionServer";
import { announceOpenDay } from "@/lib/quizNotify";
import { closeExpiredAttempts } from "@/lib/quizAttemptServer";
import { sharedResult } from "@/lib/sharedResult";
import { logger } from "@/lib/logger";

const UPKEEP_TTL_MS = 15_000;

function upkeep() {
  const now = Date.now();
  sharedResult("quiz:announce", now, UPKEEP_TTL_MS, announceOpenDay).catch((err) =>
    logger.error("quiz.announce.error", err),
  );
  sharedResult("quiz:close", now, UPKEEP_TTL_MS, closeExpiredAttempts).catch((err) =>
    logger.error("quiz.close.error", err),
  );
}

export const GET = withRoute("GET /api/quiz/standings", async (req: NextRequest) => {
  const session = await requireUser();
  upkeep();

  const asked = req.nextUrl.searchParams.get("competition");
  const allowed = asked ? await canPlay(asked, session.userId) : false;
  const id = allowed ? asked : ((await runningCompetitionsFor(session.userId))[0]?.id ?? null);

  const board = req.nextUrl.searchParams.get("board");
  const block = Number(req.nextUrl.searchParams.get("block"));
  if (id && board && Number.isInteger(block) && block >= 0) {
    return NextResponse.json(await boardBlock(id, board, block, session.userId));
  }

  return NextResponse.json(await getStandings(id, session.userId));
});
