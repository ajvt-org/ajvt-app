import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { semisFromGroups } from "@/lib/bracketServer";
import { withRoute } from "@/lib/route";

export const POST = withRoute(
  "POST /api/admin/activities/[id]/bracket/semis-from-groups",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const redo = Boolean((await req.json().catch(() => ({})))?.redo);

    const { created, groups } = await semisFromGroups(id, redo);
    await logAction(session.username, "GENERATE_BRACKET_SEMIS", groups);
    return NextResponse.json({ ok: true, created });
  },
);
