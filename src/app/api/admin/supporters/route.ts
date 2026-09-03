import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { MONEY_AREAS } from "@/lib/adminNav";
import { withRoute } from "@/lib/route";
import { getLeaderboardData, toPublicEntry, SUPPORTERS_PAGE_SIZE } from "@/lib/donationsServer";
import { supportersPage, supportersSummary } from "@/lib/supportersBoard";
import { viewerOf } from "@/lib/supportViewer";

export const GET = withRoute("GET /api/admin/supporters", async (req: NextRequest) => {
  const session = await requireArea(MONEY_AREAS.supporters);
  const { offset, limit } = supportersPage(req.nextUrl.searchParams, SUPPORTERS_PAGE_SIZE);

  const { leaderboard } = await getLeaderboardData(viewerOf(session));

  return NextResponse.json({
    rows: leaderboard.slice(offset, offset + limit).map(toPublicEntry),
    ...supportersSummary(leaderboard),
  });
});
