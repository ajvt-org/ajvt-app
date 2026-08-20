import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { ForbiddenError } from "@/lib/errors";
import { getQuizSettings, isQuizEligible } from "@/lib/quiz";
import { myCompetitions, shapeOf } from "@/lib/competitionServer";
import { roundsBegun, roundState } from "@/lib/quizRound";
import { quiz } from "@/lib/messages";

export const GET = withRoute("GET /api/quiz/competitions", async () => {
  const session = await requireUser();
  if (!(await isQuizEligible(session.userId))) throw new ForbiddenError(quiz.paidMembersOnly);

  const now = new Date();
  const rows = myCompetitionsView(await myCompetitions(session.userId), now);
  const settings = await getQuizSettings();
  return NextResponse.json({ competitions: rows, confirmAnswers: settings.confirmAnswers });
});

function myCompetitionsView(
  rows: Awaited<ReturnType<typeof myCompetitions>>,
  now: Date,
): unknown[] {
  return rows.map(({ competition, mine }) => ({
    id: competition.id,
    name: competition.name,
    visibility: competition.visibility,
    roundCount: competition.roundCount,
    startsAt: competition.startsAt,
    state: competition.startedAt ? roundState(shapeOf(competition), now) : "before",
    passedRounds: competition.startedAt ? roundsBegun(shapeOf(competition), now) : 0,
    myScore: mine.reduce((sum, a) => sum + a.score, 0),
  }));
}
