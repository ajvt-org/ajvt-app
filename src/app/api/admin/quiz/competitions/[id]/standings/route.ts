import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { getStandings } from "@/lib/quizRankingServer";

export const GET = withRoute(
  "GET /api/admin/quiz/competitions/[id]/standings",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("QUIZ");
    const { id } = await params;
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 200);
    return NextResponse.json(
      await getStandings(id, undefined, Number.isInteger(limit) ? limit : 200),
    );
  },
);
