import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { viewerOf } from "@/lib/supportViewer";
import { auditHistory } from "@/lib/auditLogServer";
import { historyQuerySchema } from "./schema";

export const GET = withRoute("GET /api/admin/history", async (req: NextRequest) => {
  const session = await requireAdminRole("SUPER");
  const { targetType, targetId } = parse(historyQuerySchema, {
    targetType: req.nextUrl.searchParams.get("targetType"),
    targetId: req.nextUrl.searchParams.get("targetId"),
  });

  return NextResponse.json({
    history: await auditHistory(targetType, targetId, viewerOf(session)),
  });
});
