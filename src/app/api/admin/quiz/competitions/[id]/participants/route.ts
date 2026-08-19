import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { setParticipants } from "@/lib/competitionServer";
import { eligibleMembers } from "@/lib/quiz";
import { common } from "@/lib/messages";

type Params = { params: Promise<{ id: string }> };

export const GET = withRoute(
  "GET /api/admin/quiz/competitions/[id]/participants",
  async (_req: NextRequest, { params }: Params) => {
    await requireAdminRole("QUIZ");
    const { id } = await params;
    const [rows, candidates] = await Promise.all([
      prisma.quizParticipant.findMany({ where: { competitionId: id }, select: { userId: true } }),
      eligibleMembers(),
    ]);
    return NextResponse.json({ userIds: rows.map((r) => r.userId), candidates });
  },
);

export const PUT = withRoute(
  "PUT /api/admin/quiz/competitions/[id]/participants",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireAdminRole("QUIZ");
    const { id } = await params;
    let body: { userIds?: unknown };
    try {
      body = await req.json();
    } catch {
      throw new ValidationError(common.invalidBody);
    }
    if (!Array.isArray(body.userIds)) throw new ValidationError(common.invalidBody);

    const saved = await setParticipants(id, body.userIds as string[]);

    await logAction(session.username, "SET_QUIZ_PARTICIPANTS", `${saved}`, {
      ...auditContext(session, req),
      targetType: "Competition",
      targetId: id,
    });

    return NextResponse.json({ saved });
  },
);
