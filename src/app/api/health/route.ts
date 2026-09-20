import { NextResponse } from "next/server";
import { withRoute } from "@/lib/route";
import { databaseIsUp } from "@/lib/siteStatsServer";

export const GET = withRoute("GET /api/health", async () => {
  if (!(await databaseIsUp())) return NextResponse.json({ ok: false }, { status: 503 });

  return NextResponse.json({ ok: true });
});
