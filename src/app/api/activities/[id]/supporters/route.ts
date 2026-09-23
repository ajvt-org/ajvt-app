import { NextRequest, NextResponse } from "next/server";
import { withRoute } from "@/lib/route";
import { NotFoundError } from "@/lib/errors";
import { activities } from "@/lib/messages";
import { publicActivityHeading } from "@/lib/publicActivitiesServer";
import { getLeaderboardData, toPublicEntry, SUPPORTERS_PAGE_SIZE } from "@/lib/donationsServer";
import { supportersPage, supportersSummary } from "@/lib/supportersBoard";
import { currentViewer } from "@/lib/supportViewer";

type Params = { params: Promise<{ id: string }> };

export const GET = withRoute(
  "GET /api/activities/[id]/supporters",
  async (req: NextRequest, { params }: Params) => {
    const { id } = await params;
    if (!(await publicActivityHeading(id))) throw new NotFoundError(activities.notFound);
    const { offset, limit } = supportersPage(req.nextUrl.searchParams, SUPPORTERS_PAGE_SIZE);

    const { leaderboard } = await getLeaderboardData(await currentViewer(), id);

    return NextResponse.json({
      rows: leaderboard.slice(offset, offset + limit).map(toPublicEntry),
      total: leaderboard.length,
      given: supportersSummary(leaderboard).given,
    });
  },
);
