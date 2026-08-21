import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { historyQuerySchema } from "./schema";

const HISTORY_LIMIT = 50;

export const GET = withRoute("GET /api/admin/history", async (req: NextRequest) => {
  await requireAdminRole("SUPER");
  const { targetType, targetId } = parse(historyQuerySchema, {
    targetType: req.nextUrl.searchParams.get("targetType"),
    targetId: req.nextUrl.searchParams.get("targetId"),
  });

  const history = await prisma.auditLog.findMany({
    where: { targetType, targetId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: {
      id: true,
      action: true,
      adminUsername: true,
      createdAt: true,
      targetLabel: true,
      before: true,
      after: true,
    },
  });

  return NextResponse.json({ history });
});
