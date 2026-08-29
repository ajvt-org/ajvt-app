import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { createSuggestedBracket, suggestBracket } from "@/lib/bracketServer";
import { withRoute } from "@/lib/route";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/bracket/suggestion",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);
    return NextResponse.json(await suggestBracket(id));
  },
);

export const POST = withRoute(
  "POST /api/admin/activities/[id]/bracket/suggestion",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const redo = Boolean((await req.json().catch(() => ({})))?.redo);

    const { created, label, problem } = await createSuggestedBracket(id, redo);
    await logAction(session.username, "GENERATE_BRACKET_SEMIS", label, {
      ...auditContext(session, req),
      targetType: "Activity",
      targetId: id,
      after: { created, label, problem },
    });
    return NextResponse.json({ ok: true, created, label });
  },
);
