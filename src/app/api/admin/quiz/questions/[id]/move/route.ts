import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { isMoveDirection } from "@/lib/quizQuestionOrder";
import { common, quiz } from "@/lib/messages";
import { moveQuestion } from "@/lib/quizQuestionEditServer";

const LABEL_MAX = 60;

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

    const { question, ids } = await moveQuestion(id, body.direction);

    await logAction(session.username, "MOVE_QUIZ_QUESTION", question.text.slice(0, LABEL_MAX));

    return NextResponse.json({ ids });
  },
);
