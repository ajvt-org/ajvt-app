import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { drawBracket } from "@/lib/bracketServer";
import { withRoute } from "@/lib/route";
import { counted } from "@/lib/arabicCount";
import { MATCH } from "@/lib/messages";

export const POST = withRoute(
  "POST /api/admin/activities/[id]/bracket/draw",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const redo = Boolean((await req.json().catch(() => ({})))?.redo);

    const { created, label } = await drawBracket(id, redo);
    await logAction(
      session.username,
      "GENERATE_BRACKET_DRAW",
      `${counted(created, MATCH)} — ${label}`,
    );
    return NextResponse.json({ ok: true, created });
  },
);
