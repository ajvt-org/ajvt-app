import "dotenv/config";
import { mkdir, readdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { assertUploadDirOutsidePublic, uploadDirFrom } from "../src/lib/uploadDir";
import { UploadDirEmptyError, uploadStoreIsMissing } from "../src/lib/uploadStore";

async function filesIn(dir: string): Promise<number> {
  try {
    return (await readdir(dir)).length;
  } catch {
    return 0;
  }
}

async function main() {
  assertUploadDirOutsidePublic(process.env);
  const dir = uploadDirFrom(process.env);
  await mkdir(dir, { recursive: true });

  const prisma = new PrismaClient();
  try {
    const stored = await prisma.proofImage.count();
    const files = await filesIn(dir);
    if (uploadStoreIsMissing({ files, stored })) throw new UploadDirEmptyError(dir, stored);
    console.log(`Uploads live in ${dir}, holding ${files} files`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
