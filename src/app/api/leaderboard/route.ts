import { NextRequest, NextResponse } from "next/server";
import { withRoute } from "@/lib/route";
import { getLeaderboardData, toPublicEntry, SUPPORTERS_PAGE_SIZE } from "@/lib/donationsServer";
import { supportersPage } from "@/lib/supportersBoard";
import { currentViewer } from "@/lib/supportViewer";

export const GET = withRoute("GET /api/leaderboard", async (req: NextRequest) => {
  const { offset, limit } = supportersPage(req.nextUrl.searchParams, SUPPORTERS_PAGE_SIZE);

  const { leaderboard } = await getLeaderboardData(await currentViewer());

  return NextResponse.json({
    rows: leaderboard.slice(offset, offset + limit).map(toPublicEntry),
    total: leaderboard.length,
  });
});
