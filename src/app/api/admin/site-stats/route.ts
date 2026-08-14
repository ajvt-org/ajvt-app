import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { getSiteStats } from "@/lib/siteStatsServer";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/admin/site-stats", async (req: NextRequest) => {
  await requireAdminRole("SUPER");
  const days = Number(req.nextUrl.searchParams.get("days")) || 30;
  const stats = await getSiteStats(days);
  return NextResponse.json(stats);
});
