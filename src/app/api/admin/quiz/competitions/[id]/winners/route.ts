import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { getWinners } from "@/lib/quizRankingServer";

type Params = { params: Promise<{ id: string }> };

export const GET = withRoute(
  "GET /api/admin/quiz/competitions/[id]/winners",
  async (_req: NextRequest, { params }: Params) => {
    await requireAdminRole("QUIZ");
    const { id } = await params;
    return NextResponse.json(await getWinners(id));
  },
);
