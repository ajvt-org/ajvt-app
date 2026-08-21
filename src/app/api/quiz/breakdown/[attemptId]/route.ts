import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { isQuizEligible } from "@/lib/quiz";
import { prisma } from "@/lib/prisma";
import { attemptDetail, NO_ATTEMPT, ROUND_STILL_OPEN } from "@/lib/quizBreakdownServer";
import { quiz } from "@/lib/messages";

export const GET = withRoute(
  "GET /api/quiz/breakdown/[attemptId]",
  async (_req: NextRequest, { params }: { params: Promise<{ attemptId: string }> }) => {
    const session = await requireUser();
    if (!(await isQuizEligible(session.userId))) throw new ForbiddenError(quiz.paidMembersOnly);

    const { attemptId } = await params;
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      select: { userId: true, round: { select: { closesAt: true } } },
    });
    if (!attempt || attempt.userId !== session.userId) throw new NotFoundError(NO_ATTEMPT);
    if (attempt.round.closesAt > new Date()) throw new ForbiddenError(ROUND_STILL_OPEN);

    return NextResponse.json({ detail: await attemptDetail(attemptId) });
  },
);
