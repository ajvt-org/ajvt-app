import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getFinanceSummary } from "@/lib/financeServer";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/admin/finance/summary", async (req: NextRequest) => {
  await requireAdmin();
  const days = Number(req.nextUrl.searchParams.get("days")) || 30;
  const summary = await getFinanceSummary(days);
  return NextResponse.json(summary);
});
