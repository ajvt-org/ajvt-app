import "dotenv/config";
import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { getUploadDir } from "../src/lib/uploadDir";
import { UPLOAD_FIELDS } from "../src/lib/uploadFields";
import {
  namesToKeep,
  orphanFiles,
  orphanFingerprints,
  referencedNames,
  sharedHashes,
  type StoredFile,
} from "../src/lib/uploadOrphans";

const SETTLED_DAYS = 7;

async function filesIn(dir: string): Promise<StoredFile[] | null> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return null;
  }
  const files: StoredFile[] = [];
  for (const name of names) {
    const info = await stat(join(dir, name)).catch(() => null);
    if (info?.isFile()) files.push({ name, modifiedAt: info.mtime });
  }
  return files;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const settledBefore = new Date(Date.now() - SETTLED_DAYS * 24 * 60 * 60 * 1000);

  const fingerprints = await prisma.proofImage.findMany({
    select: { filename: true, sha256: true, createdAt: true },
  });
  const referenced = referencedNames(
    await Promise.all(UPLOAD_FIELDS.map((field) => field.names())),
  );

  const orphanRows = orphanFingerprints(fingerprints, referenced, settledBefore);
  const orphanNames = new Set(orphanRows.map((row) => row.filename));
  const remaining = fingerprints.filter((row) => !orphanNames.has(row.filename));

  console.log(`Fingerprints held: ${fingerprints.length}`);
  console.log(`Fingerprints naming a file no record refers to: ${orphanRows.length}`);
  console.log(`Hashes held by more than one fingerprint now: ${sharedHashes(fingerprints)}`);
  console.log(`Hashes still shared once those go: ${sharedHashes(remaining)}`);

  const dir = getUploadDir();
  const files = await filesIn(dir);
  const strayFiles = files
    ? orphanFiles(files, namesToKeep(referenced, remaining), settledBefore)
    : [];

  if (files === null) {
    console.log(`The upload directory ${dir} could not be read, so no file is considered.`);
  } else {
    console.log(`Files held in ${dir}: ${files.length}`);
    console.log(`Files nothing refers to: ${strayFiles.length}`);
  }

  console.log(`Anything newer than ${SETTLED_DAYS} days is left alone.`);

  if (!apply) {
    console.log("Dry run. Pass --apply to write.");
    return;
  }

  const removed = await prisma.proofImage.deleteMany({
    where: { filename: { in: [...orphanNames] } },
  });
  console.log(`Fingerprints removed: ${removed.count}`);

  let unlinked = 0;
  for (const file of strayFiles) {
    try {
      await unlink(join(dir, file.name));
      unlinked += 1;
    } catch (err) {
      console.error(`${file.name} was not removed`, err);
    }
  }
  console.log(`Files removed: ${unlinked}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
