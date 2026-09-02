import { NextRequest, NextResponse } from "next/server";
import { requireUnscopedAdmin } from "@/lib/activityAccessServer";
import { getFinanceSummary } from "@/lib/financeServer";
import { viewerOf } from "@/lib/supportViewer";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/admin/finance/summary", async (req: NextRequest) => {
  const session = await requireUnscopedAdmin();
  const days = Number(req.nextUrl.searchParams.get("days")) || 30;
  const activityId = req.nextUrl.searchParams.get("activityId") ?? undefined;
  const summary = await getFinanceSummary(viewerOf(session), days, activityId);
  return NextResponse.json(summary);
});
