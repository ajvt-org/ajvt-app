import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { seesEverySupporterName } from "@/lib/supportPrivacy";
import { viewerOf } from "@/lib/supportViewer";
import { confidentialNames } from "@/lib/supportPrivacyServer";
import { scrubNames } from "@/lib/auditLogRedaction";
import { historyQuerySchema } from "./schema";

const HISTORY_LIMIT = 50;

export const GET = withRoute("GET /api/admin/history", async (req: NextRequest) => {
  const session = await requireAdminRole("SUPER");
  const { targetType, targetId } = parse(historyQuerySchema, {
    targetType: req.nextUrl.searchParams.get("targetType"),
    targetId: req.nextUrl.searchParams.get("targetId"),
  });

  const withheld = seesEverySupporterName(viewerOf(session)) ? [] : await confidentialNames();

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

  return NextResponse.json({ history: history.map((entry) => scrubNames(entry, withheld)) });
});
