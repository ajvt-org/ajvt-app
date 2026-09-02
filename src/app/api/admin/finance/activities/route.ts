import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { MONEY_AREAS } from "@/lib/adminNav";
import { activityFinanceReport } from "@/lib/activityReportServer";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { dateSpanSchema, spanBounds } from "@/lib/dateSpan";

export const GET = withRoute("GET /api/admin/finance/activities", async (req: NextRequest) => {
  await requireArea(MONEY_AREAS.activityReport);
  const { from, to } = parse(dateSpanSchema, {
    from: req.nextUrl.searchParams.get("from"),
    to: req.nextUrl.searchParams.get("to"),
  });

  const span = spanBounds(from, to);

  return NextResponse.json(await activityFinanceReport(span.from, span.to));
});
