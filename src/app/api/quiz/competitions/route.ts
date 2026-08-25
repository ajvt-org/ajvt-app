import { NextResponse } from "next/server";
import { getUserSession, requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { getQuizSettings, isQuizEligible } from "@/lib/quiz";
import { myCompetitions, publicCompetitions } from "@/lib/competitionServer";
import { competitionRows } from "@/lib/competitionView";

export const GET = withRoute("GET /api/quiz/competitions", async () => {
  const signedIn = await getUserSession();
  const settings = await getQuizSettings();
  const now = new Date();

  if (!signedIn) {
    const rows = (await publicCompetitions()).map((competition) => ({ competition, mine: [] }));
    return NextResponse.json({
      competitions: competitionRows(rows, now),
      confirmAnswers: settings.confirmAnswers,
      canPlay: false,
      signedIn: false,
    });
  }

  const session = await requireUser();
  if (!(await isQuizEligible(session.userId))) {
    const rows = (await publicCompetitions()).map((competition) => ({ competition, mine: [] }));
    return NextResponse.json({
      competitions: competitionRows(rows, now),
      confirmAnswers: settings.confirmAnswers,
      canPlay: false,
      signedIn: true,
    });
  }

  return NextResponse.json({
    competitions: competitionRows(await myCompetitions(session.userId), now),
    confirmAnswers: settings.confirmAnswers,
    canPlay: true,
    signedIn: true,
  });
});
