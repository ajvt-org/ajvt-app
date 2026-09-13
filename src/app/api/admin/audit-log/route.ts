import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { AUDIT_PAGE_SIZE, buildWhere, readPage } from "@/lib/auditFilters";
import { seesEverySupporterName } from "@/lib/supportPrivacy";
import { viewerOf } from "@/lib/supportViewer";
import { confidentialNames } from "@/lib/supportPrivacyServer";
import { scrubNames } from "@/lib/auditLogRedaction";
import { purgeExpiredAuditLog } from "@/lib/auditRetentionServer";

async function choices() {
  const [admins, actions, targets] = await Promise.all([
    prisma.auditLog.findMany({ distinct: ["adminUsername"], select: { adminUsername: true } }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true } }),
    prisma.auditLog.findMany({
      distinct: ["targetType"],
      where: { targetType: { not: null } },
      select: { targetType: true },
    }),
  ]);
  return {
    admins: admins.map((a) => a.adminUsername).sort(),
    actions: actions.map((a) => a.action).sort(),
    targets: targets.map((t) => t.targetType as string).sort(),
  };
}

export const GET = withRoute("GET /api/admin/audit-log", async (req: NextRequest) => {
  const session = await requireAdminRole("SUPER");
  await purgeExpiredAuditLog();
  const params = req.nextUrl.searchParams;
  const where = buildWhere(params);
  const page = readPage(params);

  const withheld = seesEverySupporterName(viewerOf(session)) ? [] : await confidentialNames();

  const [logs, total, options] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    choices(),
  ]);

  return NextResponse.json({
    logs: logs.map((log) => scrubNames(log, withheld)),
    total,
    page,
    pageSize: AUDIT_PAGE_SIZE,
    ...options,
  });
});
