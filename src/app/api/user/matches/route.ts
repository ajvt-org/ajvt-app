import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { myMatches } from "@/lib/myFixturesServer";

export const GET = withRoute("GET /api/user/matches", async () => {
  const session = await requireUser();

  return NextResponse.json(await myMatches(session.userId));
});
