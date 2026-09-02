import { NextRequest, NextResponse } from "next/server";
import { withRoute } from "@/lib/route";
import { getLeaderboardData, toPublicEntry, SUPPORTERS_PAGE_SIZE } from "@/lib/donationsServer";
import { currentViewer } from "@/lib/supportViewer";

export const GET = withRoute("GET /api/leaderboard", async (req: NextRequest) => {
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset")) || 0);
  const limit = Math.min(
    SUPPORTERS_PAGE_SIZE,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || SUPPORTERS_PAGE_SIZE),
  );

  const { leaderboard } = await getLeaderboardData(await currentViewer());

  return NextResponse.json({
    rows: leaderboard.slice(offset, offset + limit).map(toPublicEntry),
    total: leaderboard.length,
  });
});
