import { prisma } from "./prisma";
import { retentionExpiry, type DeletableKind } from "./deletedRecords";
import type { Prisma } from "@prisma/client";

export async function purgeExpired(now = new Date()): Promise<number> {
  const { count } = await prisma.deletedRecord.deleteMany({
    where: { expiresAt: { lte: now } },
  });
  return count;
}

export async function archive(
  kind: DeletableKind,
  recordId: string,
  label: string,
  data: Prisma.InputJsonValue,
  deletedBy: string,
  now = new Date(),
) {
  return prisma.deletedRecord.create({
    data: { kind, recordId, label, data, deletedBy, expiresAt: retentionExpiry(now) },
  });
}

export async function listArchived(now = new Date()) {
  await purgeExpired(now);
  return prisma.deletedRecord.findMany({ orderBy: { deletedAt: "desc" } });
}
