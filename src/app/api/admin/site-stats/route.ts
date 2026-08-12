import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { getSiteStats } from "@/lib/siteStatsServer";

export async function GET(req: NextRequest) {
  try {
    await requireAdminRole("SUPER");
    const days = Number(req.nextUrl.searchParams.get("days")) || 30;
    const stats = await getSiteStats(days);
    return NextResponse.json(stats);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Site stats error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
