import "dotenv/config";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { processImage } from "../src/lib/imageProcessing";
import { proofHash } from "../src/lib/proofHash";
import { planFor } from "../src/lib/legacyImages";
import { UPLOAD_FIELDS } from "../src/lib/uploadFields";
import { completeFiles, writeWhole } from "../src/lib/wholeFiles";

// Re-encodes the uploads compression never touched. Non-webp original: write
// the webp pair, rename every reference, rehash the fingerprint on the webp
// bytes so both eras compare. Raw webp without a thumbnail: write the
// thumbnail. Renames run per file, the original is deleted last, so an
// interrupted run converges on the next boot. Spawned in the background by
// start.mjs since the app serves the old files fine meanwhile.

function uploadDir(): string {
  return process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
}

async function main() {
  const dir = uploadDir();
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
      for (const field of UPLOAD_FIELDS) await field.rename(plan.filename, plan.webp);
      await prisma.proofImage.updateMany({
        where: { filename: plan.filename },
        data: { filename: plan.webp, sha256: proofHash(full) },
      });
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
