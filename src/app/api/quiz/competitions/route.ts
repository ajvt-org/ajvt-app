import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { ForbiddenError } from "@/lib/errors";
import { getQuizSettings, isQuizEligible } from "@/lib/quiz";
import { myCompetitions } from "@/lib/competitionServer";
import { competitionRows } from "@/lib/competitionView";
import { quiz } from "@/lib/messages";

export const GET = withRoute("GET /api/quiz/competitions", async () => {
  const session = await requireUser();
  if (!(await isQuizEligible(session.userId))) throw new ForbiddenError(quiz.paidMembersOnly);

  const settings = await getQuizSettings();
  return NextResponse.json({
    competitions: competitionRows(await myCompetitions(session.userId), new Date()),
    confirmAnswers: settings.confirmAnswers,
    canPlay: true,
  });
});
