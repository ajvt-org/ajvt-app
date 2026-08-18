import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { AUDIT_PAGE_SIZE, readAuditFilters, readPage } from "@/lib/auditFilters";
import type { Prisma } from "@prisma/client";

function dayRange(from: string, to: string) {
  const range: Prisma.DateTimeFilter = {};
  if (from) range.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) range.lte = new Date(`${to}T23:59:59.999Z`);
  return range;
}

function buildWhere(params: URLSearchParams): Prisma.AuditLogWhereInput {
  const { admin, action, target, from, to } = readAuditFilters(params);
  const where: Prisma.AuditLogWhereInput = {};
  if (admin) where.adminUsername = admin;
  if (action) where.action = action;
  if (target) where.targetType = target;
  if (from || to) where.createdAt = dayRange(from, to);
  return where;
}

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
  await requireAdminRole("SUPER");
  const params = req.nextUrl.searchParams;
  const where = buildWhere(params);
  const page = readPage(params);

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

  return NextResponse.json({ logs, total, page, pageSize: AUDIT_PAGE_SIZE, ...options });
});
