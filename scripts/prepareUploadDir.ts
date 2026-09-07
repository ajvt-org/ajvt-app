import "dotenv/config";
import { mkdir, readdir } from "node:fs/promises";
import { prisma } from "../src/lib/prisma";
import { assertUploadDirOutsidePublic, uploadDirFrom } from "../src/lib/uploadDir";
import { UploadDirEmptyError, uploadStoreIsMissing } from "../src/lib/uploadStore";

async function filesIn(dir: string): Promise<number> {
  try {
    return (await readdir(dir)).length;
  } catch {
    return 0;
  }
}

async function storedCount(): Promise<number | null> {
  try {
    return await prisma.proofImage.count();
  } catch {
    return null;
  }
}

async function main() {
  assertUploadDirOutsidePublic(process.env);
  const dir = uploadDirFrom(process.env);
  await mkdir(dir, { recursive: true });

  const files = await filesIn(dir);
  const stored = await storedCount();
  await prisma.$disconnect().catch(() => {});

  if (stored === null) {
    console.log(`Uploads live in ${dir}, holding ${files} files. The store was not checked.`);
    return;
  }
  if (uploadStoreIsMissing({ files, stored })) throw new UploadDirEmptyError(dir, stored);
  console.log(`Uploads live in ${dir}, holding ${files} files against ${stored} recorded`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
