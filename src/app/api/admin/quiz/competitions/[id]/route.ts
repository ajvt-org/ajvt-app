import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { requireCompetition, saveCompetition, deleteCompetition } from "@/lib/competitionServer";
import { common } from "@/lib/messages";

type Params = { params: Promise<{ id: string }> };

export const GET = withRoute(
  "GET /api/admin/quiz/competitions/[id]",
  async (_req: NextRequest, { params }: Params) => {
    await requireAdminRole("QUIZ");
    const { id } = await params;
    const competition = await requireCompetition(id);
    return NextResponse.json({ competition });
  },
);

export const PUT = withRoute(
  "PUT /api/admin/quiz/competitions/[id]",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireAdminRole("QUIZ");
    const { id } = await params;
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError(common.invalidBody);
    }

    const competition = await saveCompetition(body, id);

    await logAction(session.username, "SAVE_COMPETITION", competition.name, {
      ...auditContext(session, req),
      targetType: "Competition",
      targetId: competition.id,
    });

    return NextResponse.json({ competition });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/quiz/competitions/[id]",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireAdminRole("QUIZ");
    const { id } = await params;
    const competition = await deleteCompetition(id);

    await logAction(session.username, "DELETE_COMPETITION", competition.name, {
      ...auditContext(session, req),
      targetType: "Competition",
      targetId: id,
      before: { name: competition.name, startsAt: competition.startsAt },
    });

    return NextResponse.json({ deleted: true });
  },
);
