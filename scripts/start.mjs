import { execSync } from "child_process";
import { mkdirSync } from "fs";

const uploadDir = process.env.UPLOAD_DIR || "public/uploads";
mkdirSync(uploadDir, { recursive: true });

console.log("→ Running database migrations...");
execSync("npx prisma migrate deploy", { stdio: "inherit" });

console.log("→ Seeding admin (skipped if exists)...");
execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });

console.log("→ Fingerprinting payment proofs (skipped if done)...");
try {
  execSync("npx tsx prisma/backfillProofHashes.ts", { stdio: "inherit" });
} catch {
  console.log("  Fingerprinting skipped.");
}

console.log("→ Starting Next.js...");
execSync("npx next start", { stdio: "inherit" });
