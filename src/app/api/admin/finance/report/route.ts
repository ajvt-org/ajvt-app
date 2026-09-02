import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { MONEY_AREAS } from "@/lib/adminNav";
import { financeReport } from "@/lib/financeReportServer";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { dateSpanSchema, spanBounds } from "@/lib/dateSpan";

export const GET = withRoute("GET /api/admin/finance/report", async (req: NextRequest) => {
  await requireArea(MONEY_AREAS.report);
  const { from, to } = parse(dateSpanSchema, {
    from: req.nextUrl.searchParams.get("from"),
    to: req.nextUrl.searchParams.get("to"),
  });

  const span = spanBounds(from, to);

  return NextResponse.json(await financeReport(span.from, span.to));
});
