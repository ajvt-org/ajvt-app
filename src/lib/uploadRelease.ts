import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { getUploadDir } from "./uploadDir";
import { countUploadReferrers } from "./uploadFields";
import { namesToRelease, thumbnailOf } from "./uploadNames";

async function removeFile(dir: string, name: string): Promise<void> {
  try {
    await unlink(join(dir, name));
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return;
    logger.error("upload.release.file", { name, err: (err as Error)?.message });
  }
}

async function releaseOne(filename: string): Promise<boolean> {
  if (await countUploadReferrers(filename)) return false;

  await prisma.proofImage.deleteMany({ where: { filename } });
  const dir = getUploadDir();
  await removeFile(dir, filename);
  await removeFile(dir, thumbnailOf(filename));
  return true;
}

export async function releaseUploads(...names: (string | null | undefined)[]): Promise<void> {
  for (const filename of namesToRelease(names)) {
    try {
      await releaseOne(filename);
    } catch (err) {
      logger.error("upload.release.error", { filename, err: (err as Error)?.message });
    }
  }
}
