import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { isMoveDirection, moveInOrder } from "@/lib/quizQuestionOrder";
import { common, quiz } from "@/lib/messages";

export const POST = withRoute(
  "POST /api/admin/quiz/questions/[id]/move",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("QUIZ");
    const { id } = await params;

    let body: { direction?: unknown };
    try {
      body = await req.json();
    } catch {
      throw new ValidationError(common.invalidBody);
    }
    if (!isMoveDirection(body.direction)) throw new ValidationError(quiz.unknownDirection);

    const question = await prisma.quizQuestion.findUnique({
      where: { id },
      select: { bankId: true, text: true },
    });
    if (!question) {
      return NextResponse.json({ error: quiz.questionNotFound }, { status: 404 });
    }

    const siblings = await prisma.quizQuestion.findMany({
      where: { bankId: question.bankId },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: { id: true },
    });

    const wanted = moveInOrder(
      siblings.map((sibling) => sibling.id),
      id,
      body.direction,
    );

    await prisma.$transaction(
      wanted.map((questionId, position) =>
        prisma.quizQuestion.update({ where: { id: questionId }, data: { order: position } }),
      ),
    );

    await logAction(session.username, "MOVE_QUIZ_QUESTION", question.text.slice(0, 60));

    return NextResponse.json({ ids: wanted });
  },
);
