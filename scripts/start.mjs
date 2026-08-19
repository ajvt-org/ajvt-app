import { execSync, spawn } from "child_process";
import { mkdirSync } from "fs";
import { createRequire } from "module";

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

// The three steps above are boot work and block on purpose: nothing serves a
// request before the database matches the code. This one is the server, and it
// differs on both counts. It is spawned, not run synchronously, so the SIGTERM
// the platform sends on every deploy reaches Next and lets it drain what is in
// flight rather than stopping at this script and severing it. And node runs
// Next's own entry point rather than `npx next start`, which would put an npx
// process and a shell in between for the signal to stop at instead.
//
// The child's exit code is passed on, so restartPolicyType = "on_failure"
// still reads a failure as one.
console.log("→ Starting Next.js...");
const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
const server = spawn(process.execPath, [next, "start"], { stdio: "inherit" });

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.kill(signal));
}

server.on("exit", (code, signal) => {
  if (signal) {
    // Re-raise so the parent's own exit status is the signal, not a code. The
    // listener has to go first or the handler above would catch it again.
    process.removeAllListeners(signal);
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
