import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { advanceBracket } from "@/lib/bracketServer";
import { withRoute } from "@/lib/route";
import { counted } from "@/lib/arabicCount";
import { MATCH } from "@/lib/messages";

export const POST = withRoute(
  "POST /api/admin/activities/[id]/bracket/next-round",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);

    const { created, label } = await advanceBracket(id);
    await logAction(
      session.username,
      "GENERATE_BRACKET_NEXT_ROUND",
      `${label} — ${counted(created, MATCH)}`,
    );
    return NextResponse.json({ ok: true, created });
  },
);
