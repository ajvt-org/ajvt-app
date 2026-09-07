import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { getUploadDir } from "../src/lib/uploadDir";
import { proofHash } from "../src/lib/proofHash";

async function main() {
  const [payments, donations, expenses, known] = await Promise.all([
    prisma.payment.findMany({ where: { proof: { not: null } }, select: { proof: true } }),
    prisma.donation.findMany({ where: { proof: { not: null } }, select: { proof: true } }),
    prisma.expense.findMany({ where: { proof: { not: null } }, select: { proof: true } }),
    prisma.proofImage.findMany({ select: { filename: true } }),
  ]);

  const seen = new Set(known.map((row) => row.filename));
  const names = new Set(
    [
      ...payments.map((p) => p.proof),
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
      const bytes = await readFile(join(getUploadDir(), filename));
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
