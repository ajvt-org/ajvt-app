import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { isQuizEligible } from "@/lib/quiz";
import { canPlay, NO_COMPETITION } from "@/lib/competitionServer";
import { attemptsOf } from "@/lib/quizBreakdownServer";
import { quiz } from "@/lib/messages";

export const GET = withRoute("GET /api/quiz/breakdown", async (req: NextRequest) => {
  const session = await requireUser();
  if (!(await isQuizEligible(session.userId))) throw new ForbiddenError(quiz.paidMembersOnly);

  const competitionId = req.nextUrl.searchParams.get("competition");
  if (!competitionId) throw new ValidationError(NO_COMPETITION);
  if (!(await canPlay(competitionId, session.userId))) throw new ForbiddenError(quiz.notInvited);

  return NextResponse.json({ rounds: await attemptsOf(competitionId, session.userId) });
});
