import { prisma } from "./prisma";
import {
  AUDIT_LOGIN_ACTION,
  AUDIT_LOGIN_DAYS,
  AUDIT_LOG_DAYS,
  auditCutoff,
} from "./auditRetention";

export async function purgeExpiredAuditLog(now = new Date()): Promise<number> {
  const logins = await prisma.auditLog.deleteMany({
    where: { action: AUDIT_LOGIN_ACTION, createdAt: { lt: auditCutoff(now, AUDIT_LOGIN_DAYS) } },
  });
  const rest = await prisma.auditLog.deleteMany({
    where: {
      action: { not: AUDIT_LOGIN_ACTION },
      createdAt: { lt: auditCutoff(now, AUDIT_LOG_DAYS) },
    },
  });
  return logins.count + rest.count;
}
