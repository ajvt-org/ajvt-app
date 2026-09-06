import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { withdrawAdjustmentRule } from "@/lib/matchSeriesServer";

type Params = { params: Promise<{ id: string; ruleId: string }> };

export const DELETE = withRoute(
  "DELETE /api/admin/activities/[id]/adjustment-rules/[ruleId]",
  async (_req: NextRequest, { params }: Params) => {
    const { id, ruleId } = await params;
    const session = await requireActivityAccess(id);

    const rule = await withdrawAdjustmentRule(id, ruleId);
    await logAction(session.username, "WITHDRAW_ADJUSTMENT_RULE", rule.name);

    return NextResponse.json({ deleted: true });
  },
);
