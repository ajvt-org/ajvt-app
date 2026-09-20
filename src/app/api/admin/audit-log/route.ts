import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { viewerOf } from "@/lib/supportViewer";
import { auditLogPage } from "@/lib/auditLogServer";

export const GET = withRoute("GET /api/admin/audit-log", async (req: NextRequest) => {
  const session = await requireAdminRole("SUPER");

  return NextResponse.json(await auditLogPage(req.nextUrl.searchParams, viewerOf(session)));
});
