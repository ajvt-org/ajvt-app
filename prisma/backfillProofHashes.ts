import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { proofHash } from "../src/lib/proofHash";

// Fingerprints the proofs already on disk. Without this the check would only
// ever see uploads made after it shipped, which is the half that matters
// least — the reuse worth catching is against what is already there.
//
// Safe to run again: a filename already fingerprinted is skipped, and a file
// that has gone missing is reported rather than fatal.
function uploadDir(): string {
  return process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
}

async function main() {
  const [memberships, donations, expenses, known] = await Promise.all([
    prisma.membership.findMany({
      where: { paymentProof: { not: null } },
      select: { paymentProof: true },
    }),
    prisma.donation.findMany({ where: { proof: { not: null } }, select: { proof: true } }),
    prisma.expense.findMany({ where: { proof: { not: null } }, select: { proof: true } }),
    prisma.proofImage.findMany({ select: { filename: true } }),
  ]);

  const seen = new Set(known.map((row) => row.filename));
  const names = new Set(
    [
      ...memberships.map((m) => m.paymentProof),
      ...donations.map((d) => d.proof),
      ...expenses.map((e) => e.proof),
    ].filter((n): n is string => !!n),
  );

  const todo = [...names].filter((n) => !seen.has(n));
  console.log(`${names.size} proofs referenced, ${todo.length} still to fingerprint`);

  let done = 0;
  const missing: string[] = [];
  for (const filename of todo) {
    try {
      const bytes = await readFile(join(uploadDir(), filename));
      await prisma.proofImage.create({ data: { filename, sha256: proofHash(bytes) } });
      done++;
    } catch {
      missing.push(filename);
    }
  }

  console.log(`fingerprinted ${done}`);
  if (missing.length) console.log(`file missing on disk for ${missing.length}: ${missing[0]} ...`);

  const dupes = await prisma.proofImage.groupBy({
    by: ["sha256"],
    _count: { sha256: true },
    having: { sha256: { _count: { gt: 1 } } },
  });
  console.log(`images used by more than one record: ${dupes.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
