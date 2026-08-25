import { NextRequest, NextResponse } from "next/server";
import { getUserSession, requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { boardBlock, getStandings } from "@/lib/quizRankingServer";
import {
  canPlay,
  isPublicCompetition,
  publicCompetitions,
  runningCompetitionsFor,
} from "@/lib/competitionServer";
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

async function visible(asked: string | null, userId: string | undefined): Promise<string | null> {
  if (userId) {
    if (asked && (await canPlay(asked, userId))) return asked;
    return (await runningCompetitionsFor(userId))[0]?.id ?? null;
  }
  if (asked && (await isPublicCompetition(asked))) return asked;
  return (await publicCompetitions())[0]?.id ?? null;
}

export const GET = withRoute("GET /api/quiz/standings", async (req: NextRequest) => {
  const signedIn = await getUserSession();
  const userId = signedIn ? (await requireUser()).userId : undefined;
  upkeep();

  const id = await visible(req.nextUrl.searchParams.get("competition"), userId);

  const board = req.nextUrl.searchParams.get("board");
  const block = Number(req.nextUrl.searchParams.get("block"));
  if (id && board && Number.isInteger(block) && block >= 0) {
    return NextResponse.json(await boardBlock(id, board, block, userId));
  }

  return NextResponse.json(await getStandings(id, userId));
});
