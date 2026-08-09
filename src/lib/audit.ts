import { prisma } from "./prisma";

export async function logAction(adminUsername: string, action: string, targetLabel?: string) {
  try {
    await prisma.auditLog.create({ data: { adminUsername, action, targetLabel } });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}
