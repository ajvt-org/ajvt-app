import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { listRounds, setRoundPool } from "@/lib/quizPoolServer";
import { common } from "@/lib/messages";

type Params = { params: Promise<{ id: string }> };

export const GET = withRoute(
  "GET /api/admin/quiz/competitions/[id]/rounds",
  async (_req: NextRequest, { params }: Params) => {
    await requireAdminRole("QUIZ");
    const { id } = await params;
    const { competition, rounds } = await listRounds(id);
    return NextResponse.json({
      rounds,
      servedCount: competition.servedCount,
      poolSize: competition.poolSize,
      startedAt: competition.startedAt,
    });
  },
);

export const PUT = withRoute(
  "PUT /api/admin/quiz/competitions/[id]/rounds",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireAdminRole("QUIZ");
    const { id } = await params;
    let body: { index?: unknown; questionIds?: unknown };
    try {
      body = await req.json();
    } catch {
      throw new ValidationError(common.invalidBody);
    }
    if (!Number.isInteger(body.index) || !Array.isArray(body.questionIds)) {
      throw new ValidationError(common.invalidBody);
    }

    const result = await setRoundPool(id, body.index as number, body.questionIds as string[]);

    await logAction(session.username, "SET_QUIZ_ROUND_POOL", String(result.index), {
      ...auditContext(session, req),
      targetType: "QuizRound",
      targetId: id,
      after: { loaded: result.loaded },
    });

    return NextResponse.json(result);
  },
);
