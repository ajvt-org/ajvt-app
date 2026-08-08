// Production start: run migrations → seed admin if needed → start Next.js
import { execSync } from "child_process";
import { mkdirSync } from "fs";

// Ensure upload dir exists
const uploadDir = process.env.UPLOAD_DIR || "public/uploads";
mkdirSync(uploadDir, { recursive: true });

console.log("→ Running database migrations...");
execSync("npx prisma migrate deploy", { stdio: "inherit" });

console.log("→ Seeding admin (skipped if exists)...");
try {
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
} catch {
  console.log("  Seed skipped or already done.");
}

console.log("→ Starting Next.js...");
execSync("npx next start", { stdio: "inherit" });
