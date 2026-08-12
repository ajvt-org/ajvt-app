import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getFinanceSummary } from "@/lib/financeServer";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const days = Number(req.nextUrl.searchParams.get("days")) || 30;
    const summary = await getFinanceSummary(days);
    return NextResponse.json(summary);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Finance summary error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
