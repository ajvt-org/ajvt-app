import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { ForbiddenError } from "@/lib/errors";
import { attemptDetail } from "@/lib/quizBreakdownServer";
import { quiz } from "@/lib/messages";

export const GET = withRoute(
  "GET /api/quiz/breakdown/[id]",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id } = await params;
    const detail = await attemptDetail(id);
    if (detail.userId !== session.userId) throw new ForbiddenError(quiz.notYourAttempt);
    return NextResponse.json({ detail });
  },
);
