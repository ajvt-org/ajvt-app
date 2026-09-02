import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { MONEY_AREAS } from "@/lib/adminNav";
import { getFinanceSummary } from "@/lib/financeServer";
import { viewerOf } from "@/lib/supportViewer";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/admin/finance/summary", async (req: NextRequest) => {
  const session = await requireArea(MONEY_AREAS.expenses);
  const days = Number(req.nextUrl.searchParams.get("days")) || 30;
  const activityId = req.nextUrl.searchParams.get("activityId") ?? undefined;
  const summary = await getFinanceSummary(viewerOf(session), days, activityId);
  return NextResponse.json(summary);
});
