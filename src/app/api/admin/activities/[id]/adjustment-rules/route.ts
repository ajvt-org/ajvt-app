import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { common } from "@/lib/messages";
import { declareAdjustmentRule, listAdjustmentRules } from "@/lib/matchSeriesServer";

type Params = { params: Promise<{ id: string }> };

export const GET = withRoute(
  "GET /api/admin/activities/[id]/adjustment-rules",
  async (_req: NextRequest, { params }: Params) => {
    const { id } = await params;
    await requireActivityAccess(id);
    return NextResponse.json({ rules: await listAdjustmentRules(id) });
  },
);

export const POST = withRoute(
  "POST /api/admin/activities/[id]/adjustment-rules",
  async (req: NextRequest, { params }: Params) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);

    let body: { name?: unknown; partsToSelf?: unknown; partsFromOther?: unknown };
    try {
      body = await req.json();
    } catch {
      throw new ValidationError(common.invalidBody);
    }

    const rule = await declareAdjustmentRule(id, {
      name: typeof body.name === "string" ? body.name : "",
      partsToSelf: Number(body.partsToSelf),
      partsFromOther: Number(body.partsFromOther),
    });
    await logAction(session.username, "DECLARE_ADJUSTMENT_RULE", rule.name);

    return NextResponse.json({ rule }, { status: 201 });
  },
);
