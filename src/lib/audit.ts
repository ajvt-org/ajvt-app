import { prisma } from "./prisma";
import { logger } from "./logger";
import { redact } from "./redact";
import { getClientIp } from "./rateLimit";
import type { AuditAction } from "./auditLabels";
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

export type AuditDetails = {
  adminId?: string;
  adminRole?: string;
  targetType?: string;
  targetId?: string;
  before?: unknown;
  after?: unknown;
  meta?: unknown;
  ip?: string;
  userAgent?: string;
};

export function auditContext(
  session: { adminId: string; role: string },
  req: NextRequest,
): AuditDetails {
  return {
    adminId: session.adminId,
    adminRole: session.role,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
  };
}

function snapshot(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return redact(value) as Prisma.InputJsonValue;
}

export async function logAction(
  adminUsername: string,
  action: AuditAction,
  targetLabel?: string,
  details: AuditDetails = {},
) {
  try {
    await prisma.auditLog.create({
      data: {
        adminUsername,
        action,
        targetLabel,
        adminId: details.adminId,
        adminRole: details.adminRole,
        targetType: details.targetType,
        targetId: details.targetId,
        before: snapshot(details.before),
        after: snapshot(details.after),
        meta: snapshot(details.meta),
        ip: details.ip,
        userAgent: details.userAgent,
      },
    });
  } catch (err) {
    logger.error("audit.log.error", err);
  }
}
