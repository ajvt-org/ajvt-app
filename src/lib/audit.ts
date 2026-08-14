import { prisma } from "./prisma";
import { logger } from "./logger";

export async function logAction(adminUsername: string, action: string, targetLabel?: string) {
  try {
    await prisma.auditLog.create({ data: { adminUsername, action, targetLabel } });
  } catch (err) {
    logger.error("audit.log.error", err);
  }
}
