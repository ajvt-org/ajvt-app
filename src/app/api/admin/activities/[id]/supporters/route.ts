import { NextRequest, NextResponse } from "next/server";
import { requireActivityFinanceAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { NotFoundError } from "@/lib/errors";
import { activities } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { viewerOf } from "@/lib/supportViewer";
import { getLeaderboardData, toAdminEntry, SUPPORTERS_PAGE_SIZE } from "@/lib/donationsServer";
import { supportersPage, supportersSummary } from "@/lib/supportersBoard";

type Params = { params: Promise<{ id: string }> };

export const GET = withRoute(
  "GET /api/admin/activities/[id]/supporters",
  async (req: NextRequest, { params }: Params) => {
    const { id } = await params;
    const session = await requireActivityFinanceAccess(id);
    const exists = await prisma.activity.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundError(activities.notFound);

    const { offset, limit } = supportersPage(req.nextUrl.searchParams, SUPPORTERS_PAGE_SIZE);

    const { leaderboard } = await getLeaderboardData(viewerOf(session), id);

    return NextResponse.json({
      rows: leaderboard.slice(offset, offset + limit).map(toAdminEntry),
      total: leaderboard.length,
      given: supportersSummary(leaderboard).given,
    });
  },
);
