import "dotenv/config";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { processImage } from "../src/lib/imageProcessing";
import { proofHash } from "../src/lib/proofHash";
import { planFor } from "../src/lib/legacyImages";
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

type Ref = {
  names(): Promise<(string | null)[]>;
  rename(from: string, to: string): Promise<unknown>;
};

const refs: Ref[] = [
  {
    names: async () =>
      (await prisma.member.findMany({ select: { photo: true } })).map((r) => r.photo),
    rename: (from, to) => prisma.member.updateMany({ where: { photo: from }, data: { photo: to } }),
  },
  {
    names: async () =>
      (await prisma.member.findMany({ select: { paymentProof: true } })).map((r) => r.paymentProof),
    rename: (from, to) =>
      prisma.member.updateMany({ where: { paymentProof: from }, data: { paymentProof: to } }),
  },
  {
    names: async () =>
      (await prisma.membership.findMany({ select: { paymentProof: true } })).map(
        (r) => r.paymentProof,
      ),
    rename: (from, to) =>
      prisma.membership.updateMany({ where: { paymentProof: from }, data: { paymentProof: to } }),
  },
  {
    names: async () =>
      (await prisma.activity.findMany({ select: { photo: true } })).map((r) => r.photo),
    rename: (from, to) =>
      prisma.activity.updateMany({ where: { photo: from }, data: { photo: to } }),
  },
  {
    names: async () => (await prisma.team.findMany({ select: { logo: true } })).map((r) => r.logo),
    rename: (from, to) => prisma.team.updateMany({ where: { logo: from }, data: { logo: to } }),
  },
  {
    names: async () =>
      (await prisma.activityRegistration.findMany({ select: { paymentProof: true } })).map(
        (r) => r.paymentProof,
      ),
    rename: (from, to) =>
      prisma.activityRegistration.updateMany({
        where: { paymentProof: from },
        data: { paymentProof: to },
      }),
  },
  {
    names: async () =>
      (await prisma.donation.findMany({ select: { proof: true } })).map((r) => r.proof),
    rename: (from, to) =>
      prisma.donation.updateMany({ where: { proof: from }, data: { proof: to } }),
  },
  {
    names: async () =>
      (await prisma.donation.findMany({ select: { donorPhoto: true } })).map((r) => r.donorPhoto),
    rename: (from, to) =>
      prisma.donation.updateMany({ where: { donorPhoto: from }, data: { donorPhoto: to } }),
  },
  {
    names: async () =>
      (await prisma.expense.findMany({ select: { proof: true } })).map((r) => r.proof),
    rename: (from, to) =>
      prisma.expense.updateMany({ where: { proof: from }, data: { proof: to } }),
  },
  {
    names: async () =>
      (await prisma.payment.findMany({ select: { proof: true } })).map((r) => r.proof),
    rename: (from, to) =>
      prisma.payment.updateMany({ where: { proof: from }, data: { proof: to } }),
  },
  {
    names: async () =>
      (await prisma.payment.findMany({ select: { donorPhoto: true } })).map((r) => r.donorPhoto),
    rename: (from, to) =>
      prisma.payment.updateMany({ where: { donorPhoto: from }, data: { donorPhoto: to } }),
  },
];

async function main() {
  const dir = uploadDir();
  const onDisk = await completeFiles(dir);

  const referenced = new Set<string>();
  for (const ref of refs) {
    for (const name of await ref.names()) if (name) referenced.add(name);
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
      for (const ref of refs) await ref.rename(plan.filename, plan.webp);
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
