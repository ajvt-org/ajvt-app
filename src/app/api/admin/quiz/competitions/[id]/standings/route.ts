import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { boardBlock, getStandings } from "@/lib/quizRankingServer";

export const GET = withRoute(
  "GET /api/admin/quiz/competitions/[id]/standings",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("QUIZ");
    const { id } = await params;
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 200);
    const capped = Number.isInteger(limit) ? limit : 200;

    const board = req.nextUrl.searchParams.get("board");
    const block = Number(req.nextUrl.searchParams.get("block"));
    if (board && Number.isInteger(block) && block >= 0) {
      return NextResponse.json(await boardBlock(id, board, block, undefined, capped));
    }

    return NextResponse.json(await getStandings(id, undefined, capped));
  },
);
