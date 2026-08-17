import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { isQuizEligible, revealOptions } from "@/lib/quiz";
import { withRoute } from "@/lib/route";
import { ForbiddenError, NotFoundError, ConflictError } from "@/lib/errors";
import { quiz } from "@/lib/messages";

export const POST = withRoute(
  "POST /api/quiz/assignments/[id]/reveal",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    if (!(await isQuizEligible(session.userId))) throw new ForbiddenError(quiz.paidMembersOnly);

    const { id } = await params;
    const { assignment } = await revealOptions(id, session.userId);

    if (!assignment) throw new NotFoundError(quiz.questionNotFound);
    if (assignment.answeredAt) throw new ConflictError(quiz.alreadyAnswered);

    return NextResponse.json({
      revealedAt: assignment.revealedAt,
      answers: assignment.question.answers,
    });
  },
);
