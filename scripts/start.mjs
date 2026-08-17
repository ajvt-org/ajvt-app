// Production start: run migrations, seed the admin if there is none, start Next.js.
// The seed is not wrapped: it refuses to create an admin with a known password,
// and that refusal has to stop the boot rather than be logged and passed over.
import { execSync } from "child_process";
import { mkdirSync } from "fs";

// Ensure upload dir exists
const uploadDir = process.env.UPLOAD_DIR || "public/uploads";
mkdirSync(uploadDir, { recursive: true });

console.log("→ Running database migrations...");
execSync("npx prisma migrate deploy", { stdio: "inherit" });

console.log("→ Seeding admin (skipped if exists)...");
execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });

// The reuse check only sees a proof it has fingerprinted, and the fingerprints
// of everything uploaded before it shipped come from this. Left as a manual
// step it went unrun, so the feature went out blind to the whole history.
// Skips what is already done, so every deploy after the first costs one query.
console.log("→ Fingerprinting payment proofs (skipped if done)...");
try {
  execSync("npx tsx prisma/backfillProofHashes.ts", { stdio: "inherit" });
} catch {
  console.log("  Fingerprinting skipped.");
}

console.log("→ Starting Next.js...");
execSync("npx next start", { stdio: "inherit" });
