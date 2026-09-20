import { prisma } from "./prisma";
import { AUDIT_PAGE_SIZE, buildWhere, readPage } from "./auditFilters";
import { seesEverySupporterName, type SupportViewer } from "./supportPrivacy";
import { confidentialNames } from "./supportPrivacyServer";
import { scrubNames } from "./auditLogRedaction";
import { purgeExpiredAuditLog } from "./auditRetentionServer";

const HISTORY_LIMIT = 50;

async function withheldFrom(viewer: SupportViewer): Promise<string[]> {
  return seesEverySupporterName(viewer) ? [] : confidentialNames();
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
    admins: admins.map((row) => row.adminUsername).sort(),
    actions: actions.map((row) => row.action).sort(),
    targets: targets.map((row) => row.targetType as string).sort(),
  };
}

export async function auditLogPage(params: URLSearchParams, viewer: SupportViewer) {
  await purgeExpiredAuditLog();

  const where = buildWhere(params);
  const page = readPage(params);
  const withheld = await withheldFrom(viewer);

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

  return {
    logs: logs.map((log) => scrubNames(log, withheld)),
    total,
    page,
    pageSize: AUDIT_PAGE_SIZE,
    ...options,
  };
}

export async function auditLogExport(params: URLSearchParams, viewer: SupportViewer) {
  const withheld = await withheldFrom(viewer);
  const logs = await prisma.auditLog.findMany({
    where: buildWhere(params),
    orderBy: { createdAt: "desc" },
  });
  return logs.map((log) => scrubNames(log, withheld));
}

export async function auditHistory(targetType: string, targetId: string, viewer: SupportViewer) {
  const withheld = await withheldFrom(viewer);
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
  return history.map((entry) => scrubNames(entry, withheld));
}
