import { NextResponse } from "next/server";
import { withRoute } from "@/lib/route";
import { publicCompetitions } from "@/lib/competitionServer";
import { competitionRows } from "@/lib/competitionView";

export const GET = withRoute("GET /api/quiz/competitions/public", async () => {
  const rows = (await publicCompetitions()).map((competition) => ({ competition, mine: [] }));
  return NextResponse.json({ competitions: competitionRows(rows, new Date()), canPlay: false });
});
