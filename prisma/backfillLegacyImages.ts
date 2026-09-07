import "dotenv/config";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { getUploadDir } from "../src/lib/uploadDir";
import { processImage } from "../src/lib/imageProcessing";
import { proofHash } from "../src/lib/proofHash";
import { planFor } from "../src/lib/legacyImages";
import { renameUpload, UPLOAD_FIELDS } from "../src/lib/uploadFields";
import { completeFiles, writeWhole } from "../src/lib/wholeFiles";

async function main() {
  const dir = getUploadDir();
  const onDisk = await completeFiles(dir);

  const referenced = new Set<string>();
  for (const field of UPLOAD_FIELDS) {
    for (const name of await field.names()) if (name) referenced.add(name);
  }

  const plans = [...referenced]
    .map((name) => planFor(name, onDisk))
    .filter((plan) => plan !== null);
  console.log(`${referenced.size} images referenced, ${plans.length} still legacy`);

  let reencoded = 0;
  let thumbnails = 0;
  const failed: string[] = [];
  for (const plan of plans) {
    try {
      const original = await readFile(join(dir, plan.filename));
      const { full, thumbnail } = await processImage(original);
      if (plan.kind === "thumbnail") {
        await writeWhole(dir, plan.thumb, thumbnail);
        thumbnails++;
        continue;
      }
      await writeWhole(dir, plan.webp, full);
      await writeWhole(dir, plan.thumb, thumbnail);
      await renameUpload(plan.filename, plan.webp, proofHash(full));
      await unlink(join(dir, plan.filename));
      reencoded++;
    } catch {
      failed.push(plan.filename);
    }
  }

  console.log(`re-encoded ${reencoded}, thumbnails added ${thumbnails}`);
  if (failed.length) console.log(`could not convert ${failed.length}: ${failed[0]} ...`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
