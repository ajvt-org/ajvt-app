import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { removeQuestion, updateQuestion } from "@/lib/quizQuestionEditServer";

const LABEL_MAX = 60;

export const PATCH = withRoute(
  "PATCH /api/admin/quiz/questions/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("QUIZ");
    const { id } = await params;

    const question = await updateQuestion(id, await req.json());

    await logAction(session.username, "UPDATE_QUIZ_QUESTION", question.text.slice(0, LABEL_MAX));

    return NextResponse.json({ question });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/quiz/questions/[id]",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("QUIZ");
    const { id } = await params;

    const question = await removeQuestion(id);

    await logAction(session.username, "DELETE_QUIZ_QUESTION", question.text.slice(0, LABEL_MAX));

    return NextResponse.json({ ok: true });
  },
);
