import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { setAttemptVoided } from "@/lib/quizAttemptServer";
import { voidSchema } from "./schema";

export const POST = withRoute(
  "POST /api/admin/quiz/attempts/[id]/void",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const { id } = await params;
    const { voided } = parse(voidSchema, await req.json());
    const { userId, round } = await setAttemptVoided(id, voided, session.username);

    await logAction(
      session.username,
      voided ? "VOID_QUIZ_SCORE" : "RESTORE_QUIZ_SCORE",
      `${round + 1}`,
      {
        ...auditContext(session, req),
        targetType: "QuizAttempt",
        targetId: id,
        meta: { userId, round },
      },
    );

    return NextResponse.json({ voided });
  },
);
