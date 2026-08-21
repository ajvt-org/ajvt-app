import { NextRequest, NextResponse } from "next/server";
import { requireUnscopedAdmin } from "@/lib/activityAccessServer";
import { financeReport } from "@/lib/financeReportServer";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { financeReportSchema } from "./schema";

export const GET = withRoute("GET /api/admin/finance/report", async (req: NextRequest) => {
  await requireUnscopedAdmin();
  const { from, to } = parse(financeReportSchema, {
    from: req.nextUrl.searchParams.get("from"),
    to: req.nextUrl.searchParams.get("to"),
  });

  return NextResponse.json(
    await financeReport(new Date(`${from}T00:00:00.000Z`), new Date(`${to}T23:59:59.999Z`)),
  );
});
