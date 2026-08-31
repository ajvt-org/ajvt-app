import { createHash } from "crypto";
import type { ImportBatch } from "@prisma/client";
import { prisma } from "./prisma";

export interface BatchClaim {
  id: string;
  fileHash: string;
  fileName: string;
  rowCount: number;
  createdBy: string;
}

export function fileHashOf(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export async function claimImportBatch(claim: BatchClaim): Promise<boolean> {
  try {
    await prisma.importBatch.create({ data: claim });
    return true;
  } catch {
    return false;
  }
}

export function importBatchOf(id: string): Promise<ImportBatch | null> {
  return prisma.importBatch.findUnique({ where: { id } });
}

export function lastImportOfFile(fileHash: string): Promise<ImportBatch | null> {
  return prisma.importBatch.findFirst({
    where: { fileHash },
    orderBy: { createdAt: "desc" },
  });
}
