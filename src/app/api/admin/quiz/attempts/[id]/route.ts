import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { attemptDetail } from "@/lib/quizBreakdownServer";

export const GET = withRoute(
  "GET /api/admin/quiz/attempts/[id]",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("QUIZ");
    const { id } = await params;
    return NextResponse.json({ detail: await attemptDetail(id) });
  },
);
