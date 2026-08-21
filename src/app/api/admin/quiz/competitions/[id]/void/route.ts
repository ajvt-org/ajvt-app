import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { setCompetitionVoided } from "@/lib/quizAttemptServer";
import { competitionVoidSchema } from "./schema";

export const POST = withRoute(
  "POST /api/admin/quiz/competitions/[id]/void",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const { id } = await params;
    const { userId, voided } = parse(competitionVoidSchema, await req.json());
    const rounds = await setCompetitionVoided(id, userId, voided, session.username);

    await logAction(
      session.username,
      voided ? "VOID_QUIZ_SCORE" : "RESTORE_QUIZ_SCORE",
      `${rounds}`,
      {
        ...auditContext(session, req),
        targetType: "Competition",
        targetId: id,
        meta: { userId, rounds, allRounds: true },
      },
    );

    return NextResponse.json({ rounds });
  },
);
