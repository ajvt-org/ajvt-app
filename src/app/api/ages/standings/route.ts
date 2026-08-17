import { NextResponse } from "next/server";
import { withRoute } from "@/lib/route";
import { getAgeStandings } from "@/lib/ageStandingsServer";

export const GET = withRoute("GET /api/ages/standings", async () => {
  return NextResponse.json({ standings: await getAgeStandings() });
});
